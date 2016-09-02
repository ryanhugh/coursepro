'use strict';
var _ = require('lodash')
var macros = require('../macros')
var queue = require('d3-queue').queue

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var treeMgr = require('./treeMgr')
var user = require('../data/user')
var Graph = require('./graph')
var Keys = require('../../../common/Keys')

function GraphPanelExpand() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.openOrder = []

	this.rootNodeId = null;

	this.$document.keydown(this.onKeyDown.bind(this))
}

macros.inherent(BaseDirective, GraphPanelExpand)

GraphPanelExpand.prototype.bringExpandedPanelsToFront = function () {
	this.openOrder.forEach(function (node) {
		node.bringToFront();
	}.bind(this))
};

GraphPanelExpand.prototype.increaseShowing = function (node) {
	node.showingSectionCount += 10;
	setTimeout(function () {
		node.updateHeight()
	}.bind(this), 0)
};


GraphPanelExpand.prototype.getTreePanel = function (node) {
	var panels = node.foreignObject.getElementsByClassName('treePanel');
	if (panels.length != 1) {
		elog('should be 1 panel per node')
	}
	return panels[0];
};

GraphPanelExpand.prototype.getNodeIsSelected = function (node) {
	return user.getListIncludesClass(macros.SELECTED_LIST, node.class);
};

// the given scope is the scope of a node inside a recursions
GraphPanelExpand.prototype.updateScope = function (node, isMouseOver) {
	if (isMouseOver) {
		this.setUpwardLines(node, 8)
		this.setDownwardLines(node, 8)
	}
	else {
		this.setUpwardLines(node, 4)
		this.setDownwardLines(node, 4)
	}


	if (!node.showSelectPanel) {

		// Manually change the style of the node because AngularJS is just too slow. 
		var panel = this.getTreePanel(node);
		if (node.isExpanded) {
			panel.style['box-shadow'] = 'gray 0px 0px 9px'
			panel.style.cursor = '';
		}
		else {
			panel.style.cursor = 'pointer';
			if (isMouseOver) {
				panel.style['box-shadow'] = 'gray 0px 0px 6px'
			}
			else {
				panel.style['box-shadow'] = 'gray 0px 0px 0px'
			}
		}
	}

	// Run these regardless if the showSelctedPanel is shown or not
	if (!node.isExpanded) {
		if (isMouseOver) {
			node.bringToFront()
		}
		else if (node.isCoreq) {
			node.lowestParent.sortCoreqs()
		}

		this.bringExpandedPanelsToFront()

	}
};


// if a panel in a node is clicked
GraphPanelExpand.prototype.onExpandClick = function (node, openPanel, callback) {
	if (!callback) {
		callback = function () {}
	};

	user.setValue(macros.EXPANDED_PANEL_ONCE, true)
	Graph.instance.hideHelpTooltips();

	var q = queue()

	if (!node.class.isString) {
		q.defer(function (callback) {
			node.class.loadSections(function (err) {
				callback(err)
			}.bind(this))
		}.bind(this))

		q.defer(function (callback) {
			node.class.downloadPrereqs(function (err) {
				callback(err)
			}.bind(this))
		}.bind(this))
	}


	//this returns instantly if already loaded
	q.awaitAll(function (err) {

		// If something errors, try to continue anyway,
		// in case it is not that big of an error.
		// There is no real good recovery option here. 
		if (err) {
			elog("ERROR", err);
		}

		//node.timeout 0 because $scope.$update()
		node.timeout(function () {
			node.isExpanded = openPanel;
			node.showSelectPanel = false;

			//if it failed, toggle isExpanded and update the scope
			if (err) {
				elog("ERRor loading loadSections", err)
			}


			//update the dom with the new $scope and node
			node.$scope.$apply()

			this.updateScope(node, false);

			node.updateWidth();
			node.updateHeight();
			this.bringExpandedPanelsToFront();

			// and tell d3 to move the panel back to where it should be
			Graph.instance.force.alpha(.0051)

			if (node.isExpanded) {
				Graph.instance.moveNodeOnScreen(node);
			}

			callback()
		}.bind(this))
	}.bind(this))
};


// This saves a string representation of the children of this node (eg ['PHYS 1151', 'PHYS 1161'])
// on each node before the prereqs are mucked with
GraphPanelExpand.prototype.getNeighborsString = function (node) {

	if (user.getListIncludesClass(macros.SELECTED_LIST, node.class)) {
		if (node.allParents.length > 1) {
			return 'some other classes'
		}
		else {
			return node.neightborsString
		}
	}


	var neighbors = [];

	node.allParents.forEach(function (parent) {
		if (parent.prereqs.type === 'or') {
			neighbors = neighbors.concat(parent.prereqs.values)
		}
	}.bind(this))

	neighbors = _.uniq(neighbors)
	_.pull(neighbors, node);

	var foundBranch = false;

	neighbors.forEach(function (node, index) {
		if (!node.isClass) {
			foundBranch = true;
			return;
		}
		if (node.class.isString) {
			neighbors[index] = node.class.desc
		}
		else {
			neighbors[index] = node.class.subject + ' ' + node.class.classId
		}
	}.bind(this))


	if (neighbors.length === 0 || foundBranch) {
		return 'some other classes'
	}
	else {
		neighbors = _.uniq(neighbors)
		return neighbors.join(' or ')
	}
};




GraphPanelExpand.prototype.onPanelClick = function (node, callback) {
	if (!callback) {
		callback = function () {}
	}

	if (node.isExpanded) {
		return callback()
	}
	if (node.class.isString && !node.wouldSatisfyNode && !user.getListIncludesClass(macros.SELECTED_LIST, node.class)) {
		return callback()
	}

	this.openPanel(node, callback);
}


// if a panel in a node is clicked
GraphPanelExpand.prototype.onPanelSelect = function (node, callback) {
	if (!callback) {
		callback = function () {}
	};

	// Selecting this node will not change the node, don't allow it to be selected.
	if (!node.wouldSatisfyNode && !user.getListIncludesClass(macros.SELECTED_LIST, node.class)) {
		return callback();
	}

	node.timeout(function () {

		user.toggleListContainsClass(macros.SELECTED_LIST, node.class, false, function (err) {
			if (err) {
				elog(err);
				return callback();
			}


			// Run the entire graph through all of treeMgr again
			// this is needed to rediscover any common prereqs, recalculate depths, and pretty much 
			// everything else that treeMgr does. 

			// comment from the other code:
			// this is needed because in some cases, nodes can be affected that are children of a select node's ansestors, and that no longer need to have a line
			// to one that was just satisfied, so can make graph simpler for it
			treeMgr.go(Graph.instance.rootNode)
			Graph.instance.loadNodes(function () {

				node.showSelectPanel = false;
				node.activateForceOnClose = true;

				// Actually, keep the panel expanded when the toggle button is clicked
				node.isExpanded = true;
				clearTimeout(node.graphPanelPromptTimeout);
				node.$scope.$apply();

				if (!Graph.instance.rootNode.containsClassAsPrereq(node)) {
					console.log("Not taking any action because this node was removed by treeMgr");
					return;
				}

				node.updateWidth();
				node.updateHeight()
				node.bringToFront()
				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))
};

// Due to a bug in chrome, opacity css on an element in a foreign object in a svg causes the element to move across the screen
// So manually animate the font alpha instead. 
GraphPanelExpand.prototype.showChangesSaved = function (node) {

	var element = node.foreignObject.querySelector('.changesSaved')

	// .5 seconds to transition from current value to some grey color
	// 5 sec on the grey color
	// .5 sec to transition away
	// goal grey is 136

	clearInterval(node.changesSavedInterval);
	if (!element) {
		elog('Cant animate if dont have element')
		return;
	}

	var alphaMatch;

	if (element.style.color.startsWith('rgb(') || !element.style.color) {
		alphaMatch = 1
	}
	else {

		alphaMatch = element.style.color.match(/([\d\.]+)\)/i)
		if (!alphaMatch) {
			elog(element.style.color)
			alphaMatch = 0
		}
		else {
			alphaMatch = parseFloat(alphaMatch[1])
		}
	}

	// Color match is current color of element, where 255 = white and 0 = black
	// Go from this to 0 in .5 sec with updates every 10ms (so 50 updates)

	var delta = (1 - alphaMatch) / 50
	var currAlpha = alphaMatch;

	var count = 0;
	node.changesSavedInterval = setInterval(function () {
		count++;
		if (count <= 50) {
			currAlpha += delta;

			if (currAlpha < 1) {
				element.style.color = 'rgba(136,136,136,' + currAlpha + ')'
			}
		}

		// Set alpha to 1
		else if (count >= 50 && count <= 500) {
			element.style.color = 'rgb(136,136,136)'
		}

		// Fade away
		else if (count >= 500 && count <= 550) {
			// Over 50 ticks, need to go from alpha =1 to alpha=0
			delta = 1 / 50
			var currStep = count - 500;
			var alpha = 1 - currStep * delta;
			element.style.color = 'rgba(136,136,136,' + alpha + ')'
		}
		else {
			clearTimeout(node.changesSavedInterval)
		}
	}, 10)
};

GraphPanelExpand.prototype.selectedFun = function (node) {
	return function (value) {
		if (value === undefined) {
			return user.getListIncludesClass(macros.SELECTED_LIST, node.class)
		}
		else {
			this.showChangesSaved(node)
			this.onPanelSelect(node)
		}
	}.bind(this)
};


// This is called directly from angular
// If given undefined as argument, return the current value
// else, set value with given value
GraphPanelExpand.prototype.watchingFunc = function (node) {
	return function (value) {
		if (value === undefined) {
			return user.getListIncludesClass(macros.WATCHING_LIST, node.class)
		}
		else if (!user.getAuthenticated()) {
			Graph.instance.openWatchModel(node)
		}
		else if (value) {
			this.showChangesSaved(node)
			user.addToList(macros.WATCHING_LIST, [node.class], node.class.sections)
		}
		else {
			this.showChangesSaved(node)
			user.removeFromList(macros.WATCHING_LIST, [node.class], node.class.sections)
		}
	}.bind(this)
};




//called from graph.html 
GraphPanelExpand.prototype.onKeyDown = function (event) {
	if (event.which != 27 || event.type != 'keydown') {
		return;
	};


	var node = this.openOrder.shift();
	if (!node) {
		return;
	};
	this.closePanel(node)
};

GraphPanelExpand.prototype.canClosePanel = function (node) {
	return node.lowestParent || node.prereqs.values.length > 0 || node.coreqs.values.length > 0
}

GraphPanelExpand.prototype.openPanel = function (node, callback) {
	if (!callback) {
		callback = function () {}
	}
	if (node.isExpanded) {
		elog('openPanel was called and the panel is already open?')
		return callback()
	}

	var logUrl;
	if (node.class.isString) {
		logUrl = Keys.createWithString(node.class).getHash();
	}
	else {
		logUrl = Keys.create(node.class).getHashWithEndpoint('/listSections')
	}


	ga('send', {
		'hitType': 'pageview',
		'page': logUrl,
		'title': 'Coursepro.io'
	});


	this.openOrder.push(node)

	this.onExpandClick(node, true, callback)
};

GraphPanelExpand.prototype.closePanel = function (node, callback) {
	if (!callback) {
		callback = function () {}
	}
	if (!this.canClosePanel(node)) {
		return callback()
	}
	if (!node.isExpanded) {
		elog('closePanel was called and the panel is already closed?')
	}

	var logUrl;
	if (node.class.isString) {
		logUrl = Keys.createWithString(node.class).getHash();
	}
	else {
		// NOTE WHEN REFACTORING this isnt actually a valid enpoint, just used for GA
		logUrl = Keys.create(node.class).getHashWithEndpoint('/closePanel')
	}


	ga('send', {
		'hitType': 'pageview',
		'page': logUrl,
		'title': 'Coursepro.io'
	});


	_.pull(this.openOrder, node)

	this.onExpandClick(node, false, callback)

	if (node.activateForceOnClose) {
		node.activateForceOnClose = false;
		setTimeout(function () {
			Graph.instance.force.start()
			Graph.instance.force.alpha(.03)
		}.bind(this))
	}



};

GraphPanelExpand.prototype.setUpwardLines = function (node, lineWidth) {

	var linesToSkip = [];
	node.allParents.forEach(function (parent) {
		if (parent.prereqs.type == 'and' && !node.isClass) {
			linesToSkip = linesToSkip.concat(parent.downwardLinks)
			return;
		}
		if (parent.isClass) {
			return;
		}
		this.setUpwardLines(parent, lineWidth)
	}.bind(this))

	node.upwardLinks.forEach(function (link) {
		if (_(linesToSkip).includes(link)) {
			return;
		}
		link.style.strokeWidth = lineWidth + 'px';
	}.bind(this));


};

GraphPanelExpand.prototype.setDownwardLines = function (node, lineWidth) {
	node.downwardLinks.forEach(function (link) {
		link.style.strokeWidth = lineWidth + 'px';
	}.bind(this));

	node.prereqs.values.forEach(function (child) {
		if (child.isClass) {
			return;
		}
		this.setDownwardLines(child, lineWidth)
	}.bind(this))
};


GraphPanelExpand.prototype.onMouseOver = function (node) {
	this.updateScope(node, true);
}

GraphPanelExpand.prototype.onMouseOut = function (node) {
	this.updateScope(node, false);
};


GraphPanelExpand.prototype.startPromptTimer = function (node, event) {
	clearTimeout(node.graphPanelPromptTimeout);
	if (node.isCoreq) {
		return;
	}
	node.graphPanelPromptTimeout = setTimeout(function () {
		var coords = node.foreignObject.getBoundingClientRect();
		// If graph is still where the mouse used to be
		// (cannot get current mouse pos without another event)
		if (event.clientX < coords.left) {
			return;
		}
		else if (event.clientX > coords.right) {
			return;
		}
		else if (event.clientY < coords.top) {
			return;
		}
		else if (event.clientY > coords.bottom) {
			return;
		}
		else {
			// this.openPanelPrompt(node);
		}
	}.bind(this), 1500)
};



// Removes any nodes from thi.openOrder that are not in the graph or are not expanded
GraphPanelExpand.prototype.reloadOpenOrder = function (rootNode) {

	if (this.openOrder.length === 0) {
		return;
	}

	var newOpenOrder = []

	var stack = [rootNode]
	var curr;
	while ((curr = stack.pop())) {
		if (curr.isExpanded && _(this.openOrder).includes(curr)) {
			newOpenOrder.push(curr)
		}


		stack = stack.concat(curr.prereqs.values)
	}


	this.openOrder = newOpenOrder;
};


//this is called once when $scope.node === undefined, when the root node first loads
GraphPanelExpand.prototype.link = function ($scope, element, attrs) {

	// The graph-panel-expand is on a child element of the node element, so the passed in scope is a child of the 
	// scope we need
	var node = $scope.node;
	$scope = node.$scope;
	$scope.graphPanelExpand = this;


	element = element.parent()

	if (!node.lowestParent) {
		this.reloadOpenOrder(node)
	};

	//if only this panel, expand it
	//&& treeMgr.countClassesInTree(node) === 1
	if (!node.lowestParent && node.class._id != this.rootNodeId && node.prereqs.values.length === 0 && node.coreqs.values.length === 0) {
		this.rootNodeId = node.class._id;


		this.timeout(function () {
			//this is undone when openPanel is done, a couple lines down
			// var panel = this.getTreePanel(node);
			// panel.style.visibility = 'hidden'

			this.openPanel(node, function (err) {
				if (err) {
					elog(err);
				}

				// panel.style.visibility = ''
			}.bind(this))
		}.bind(this))

	}

	element.on('mouseover', function (event) {
		this.onMouseOver(node)
		this.startPromptTimer(node, event);
	}.bind(this))

	element.on('mousemove', function (event) {
		this.startPromptTimer(node, event);
	}.bind(this))

	element.on('mouseout', function () {
		clearTimeout(node.graphPanelPromptTimeout);
		this.onMouseOut(node)
	}.bind(this))

	var closeElement = element.find(attrs.panelClose)

	closeElement.on('click', function () {
		this.closePanel(node);
	}.bind(this))

}


GraphPanelExpand.fnName = 'GraphPanelExpand'
GraphPanelExpand.$inject = ['$document', '$timeout'];


GraphPanelExpand.prototype.GraphPanelExpand = GraphPanelExpand;
module.exports = GraphPanelExpand;
directiveMgr.addDirective(GraphPanelExpand)
