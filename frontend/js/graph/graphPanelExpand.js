'use strict';
var _ = require('lodash')
var macros = require('../macros')

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
		Graph.instance.bringToFront(node);
	}.bind(this))
};

GraphPanelExpand.prototype.increaseShowing = function (node) {
	node.showingSectionCount += 10;
	setTimeout(function () {
		Graph.instance.updateHeight(node)
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
			Graph.instance.bringToFront(node)
		}
		else if (node.isCoreq) {
			Graph.instance.sortCoreqs(node.lowestParent)
		}

		this.bringExpandedPanelsToFront()

	}
};


// if a panel in a node is clicked
GraphPanelExpand.prototype.onExpandClick = function (node, openPanel, callback) {
	if (!callback) {
		callback = function () {}
	};


	//this returns instantly if already loaded
	node.class.loadSections(function (err) {
		if (err) {
			elog("ERROR", err);
			// return callback(err)
		}
		//setTimeout 0 because $scope.$update()
		setTimeout(function () {
			node.isExpanded = openPanel;
			node.showSelectPanel = false;

			//if it failed, toggle isExpanded and update the scope
			if (err) {
				console.log("ERRor loading loadSections", err)
			}

			//$scope references just the $scope of the node that was updated, 
			// this.$scope references everything, and contains $scope


			//update the dom with the new $scope and node
			node.$scope.$apply()

			this.updateScope(node, false);

			Graph.instance.updateWidth(node);
			Graph.instance.updateHeight(node);
			this.bringExpandedPanelsToFront();

			// and tell d3 to move the panel back to where it should be
			Graph.instance.force.alpha(.0051)

			callback()
		}.bind(this))
	}.bind(this))
};

GraphPanelExpand.prototype.togglePanelPrompt = function (node, callback) {
	setTimeout(function () {
		clearTimeout(node.graphPanelPromptTimeout);
		node.showSelectPanel = !node.showSelectPanel;
		node.$scope.$apply()

		Graph.instance.updateWidth(node);
		Graph.instance.updateHeight(node);

		// and tell d3 to move the panel back to where it should be
		Graph.instance.force.alpha(.0051)

		callback()
	}.bind(this), 0)
};

GraphPanelExpand.prototype.openPanelPrompt = function (node, callback) {
	if (!callback) {
		callback = function () {}
	};
	if (node.isExpanded || node.showSelectPanel) {
		return callback();
	}
	this.togglePanelPrompt(node, callback);
	this.updateScope(node, true)
};

GraphPanelExpand.prototype.closePanelPrompt = function (node, callback) {
	if (!callback) {
		callback = function () {}
	};
	if (node.isExpanded || !node.showSelectPanel) {
		return callback()
	}
	this.togglePanelPrompt(node, callback);
	setTimeout(function () {
		this.updateScope(node, false);
	}.bind(this), 0)
};



// if a panel in a node is clicked
GraphPanelExpand.prototype.onPanelSelect = function (node, callback) {
	if (!callback) {
		callback = function () {}
	};

	// Selecting this node will not change the node, don't allow it to be selected.
	if (!node.wouldSatisfyNode && !user.getListIncludesClass(macros.SELECTED_LIST, node.class)) {
		return callback();
	}


	user.toggleListContainsClass(macros.SELECTED_LIST, node.class, false, function (err) {
		if (err) {
			elog(err);
			return callback();
		}
		this.timeout(function () {


			// Run the entire big node through all of treeMgr again
			// this is needed to rediscover any common prereqs, recalculate depths, and pretty much 
			// everything else that treeMgr does. 

			// comment from the other code:
			// this is needed because in some cases, nodes can be affected that are children of a select node's ansestors, and that no longer need to have a line
			// to one that was just satisfied, so can make graph simpler for it
			treeMgr.go(Graph.instance.rootNode)
			Graph.instance.loadNodes(function () {

				// After all the graph stuff is done, shink this panel back to avoid the redraw
				node.showSelectPanel = false;
				node.isExpanded = false;
				node.$scope.$apply();
				Graph.instance.updateWidth(node);
				Graph.instance.updateHeight(node)
				clearTimeout(node.graphPanelPromptTimeout);
				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))
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
	return node.lowestParent || node.prereqs.values.length > 0
}

GraphPanelExpand.prototype.openPanel = function (node, callback) {
	if (!callback) {
		callback = function () {}
	}
	if (node.isExpanded || node.class.isString) {

		elog('openPanel was called and the panel is already open?')
		if (node.isString) {
			return callback();
		}
	}

	ga('send', {
		'hitType': 'pageview',
		'page': Keys.create(node.class).getHashWithEndpoint('/listSections'),
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

	ga('send', {
		'hitType': 'pageview',

		// NOTE WHEN REFACTORING this isnt actually a valid enpoint, just used for GA
		'page': Keys.create(node.class).getHashWithEndpoint('/closePanel'),
		'title': 'Coursepro.io'
	});

	_.pull(this.openOrder, node)

	this.onExpandClick(node, false, callback)
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
			this.openPanelPrompt(node);
		}
	}.bind(this), 1500)
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
		this.openOrder = []
	};

	//if only this panel, expand it
	//&& treeMgr.countClassesInTree(node) === 1
	if (!node.lowestParent && node.class._id != this.rootNodeId) {
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
GraphPanelExpand.$inject = ['$document'];


GraphPanelExpand.prototype.GraphPanelExpand = GraphPanelExpand;
module.exports = GraphPanelExpand;
directiveMgr.addDirective(GraphPanelExpand)
