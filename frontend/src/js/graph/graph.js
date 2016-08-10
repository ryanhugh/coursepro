'use strict';
var _ = require('lodash')
var macros = require('../macros')
var d3 = require('d3')

// base angular stuff
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

//tree stuff
var downloadTree = require('./downloadTree')
var treeMgr = require('./treeMgr')

var WatchClassesModel = require('../watchClassesModel/watchClassesModel')


//thing that calls on download tree, treeMgr, render, popup and help
//manages the page that generates the tree graphs

function Graph() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	//updated on tree callback
	// used to show Nothing Found! or not
	this.classCount = null;

	//controls the state of the spinner
	this.isLoading = false;

	this.graphWidth = this.getSvgWidth();

	this.graphHeight = this.getSvgHeight();

	// This is the default for nodes, and is what is allways used for collision
	// When a panel expands to the prompt and to a expanded panel, tree.width changes, but this does not
	this.nodeWidth = 174
	this.nodeHeight = 50;

	// main d3 force, defined in go
	this.force = null;

	// the svg element, defined in go
	this.svg = null;

	// the container, which is the only child of the svg, defined in go
	this.container = null;


	this.links = []
	this.linkElements = null;

	this.nodes = []

	this.tree = null;

	// When calculating the position of all the nodes for the first time, 
	// initially, focus more on grouping similar nodes together,
	// and then increase the y multiplyer to move the nodes to the correct y coordinate. 
	this.yCoordAttractionMultiplyer = 1;


	var path = {};

	for (var attrName in this.$routeParams) {
		path[attrName] = decodeURIComponent(this.$routeParams[attrName])
	}

	//if given path, load graph
	if (path.classUid && path.subject) {
		setTimeout(function () {
			this.createGraph(path)
		}.bind(this), 0);
		this.$scope.focusSelector = false;
	}
	else {
		elog('not supported yet')
		this.$scope.focusSelector = true;
	}

	this.$scope.addClass = this.addClass.bind(this)

	this.$window.addEventListener('resize', function () {
		this.calculateGraphSize();
	}.bind(this))
}

Graph.prototype.getSvgWidth = function () {
	return this.$window.innerWidth - macros.SEARCH_WIDTH;
}

Graph.prototype.getSvgHeight = function () {
	return this.$window.innerHeight - macros.NAVBAR_HEIGHT;
}

Graph.$inject = ['$scope', '$routeParams', '$location', '$uibModal', '$compile', '$document', '$window', '$timeout']

Graph.isPage = true;
Graph.urls = ['/graph/:host/:termId/:subject?/:classUid?']
Graph.fnName = 'Graph'

Graph.prototype.addClass = function (aClass) {

	var obj = aClass.getIdentifer().full.obj;

	this.$location.path('/graph/' + encodeURIComponent(obj.host) + '/' + encodeURIComponent(obj.termId) + '/' + encodeURIComponent(obj.subject) + '/' + encodeURIComponent(obj.classUid))
};

Graph.prototype.getWidth = function (tree) {
	var width = Math.min(200, this.nodeWidth);
	if (tree.coreqs.values.length > 0) {
		width += tree.coreqs.values.length * 34
	}
	else {
		width += 17
	}
	return width;
};

Graph.prototype.overlap = function (rect1, rect2) {
	if (rect1.x < rect2.x + this.getWidth(rect2) &&
		rect1.x + this.getWidth(rect1) > rect2.x &&
		rect1.y < rect2.y + Math.min(200, rect2.height) &&
		Math.min(200, rect1.height) + rect1.y > rect2.y) {
		return true;
	}
	else {
		return false;
	}
}


Graph.prototype.collide = function (node1, node2) {
	if (!this.overlap(node1, node2)) {
		return;
	}

	var dx = Math.min(node1.x + this.getWidth(node1) - node2.x, node2.x + this.getWidth(node2) - node1.x, 20) / 2;
	if (node1.x < node2.x) {
		node1.x -= dx;
		node2.x += dx;
	}
	else {
		node1.x += dx;
		node2.x -= dx;
	}
};




// removing and adding nodes to graph

Graph.prototype.removeFromDom = function (node) {

	// remove the panel from list and dom
	_.pull(this.nodes, node);
	node.foreignObject.parentElement.remove()

	// remove the links from list and dom
	node.downwardLinks.forEach(function (link) {
		link.remove()
	}.bind(this))

	node.upwardLinks.forEach(function (link) {
		link.remove()
	}.bind(this))

	this.links.slice(0).forEach(function (currLink, i) {
		if (currLink.target === node || currLink.source === node) {
			_.pull(this.links[i], currLink)
		}
	}.bind(this))
};


// adds a node that was removed back to the d3 world
Graph.prototype.addToDom = function (node) {

	if (_(this.nodes).includes(node)) {
		elog('node already here?')
	}
	else {
		this.nodes.push(node)
	}


	//create the links again
	// only add lines going up because after recursion, going to add all nodes
	//concat(node.prereqs.values).
	node.allParents.forEach(function (directNode) {
		this.links.push({
			target: node,
			source: directNode
		})
	}.bind(this))

	node.upwardLinks.forEach(function (link) {
		this.container[0][0].appendChild(link)
	}.bind(this))

	// append the node after the links
	this.container[0][0].appendChild(node.foreignObject.parentElement)
};



// change z index of a node
Graph.prototype.bringToFront = function (tree) {

	// find the g element that is a parent of the foreignObject, and move it to the end of its children
	// in svgs this is how zindex works
	var g = tree.foreignObject.parentElement;
	var gParentElement = g.parentElement;
	g.remove();
	gParentElement.appendChild(g)
};

Graph.prototype.sortCoreqs = function (tree) {
	if (tree.coreqs.values.length == 0) {
		return;
	}

	for (var i = tree.coreqs.values.length - 1; i >= 0; i--) {
		this.bringToFront(tree.coreqs.values[i]);
	}
	this.bringToFront(tree);
};

Graph.prototype.updateHeight = function (tree) {

	// update the height of the panel
	tree.height = tree.foreignObject.lastChild.offsetHeight

	//update the foreign object and the g with the new height
	tree.foreignObject.setAttribute('height', tree.height)
	tree.foreignObject.parentNode.setAttribute('height', tree.height)
};

Graph.prototype.getNodeWidth = function(node) {
	if (!node.isExpanded) {
		return this.nodeWidth;
	}
	else if (node.sections.length > 0) {
		return 780;
	}
	else {
		return Math.max(576, Math.min(780, node.desc.length))
	}
};

Graph.prototype.updateWidth = function (node) {
	node.width = this.getNodeWidth(node);
	node.foreignObject.setAttribute('width', node.width)
};


Graph.prototype.checkPos = function (node) {
	if (node.x === undefined || isNaN(node.x) || isNaN(node.y) || node.y === undefined) {
		elog('invalid x or y!', node)
	}
}


Graph.prototype.estimateNodePositions = function () {
	var nodes = this.nodes;
	if (nodes[0].x === undefined) {
		nodes[0].x = this.getSvgWidth() / 2;
	}

	nodes.forEach(function (node) {
		if (node.isCoreq) {
			node.x = 0
			node.y = 0;
			return;
		}

		if (node.x === undefined) {
			// Find average percent index * 1000, used as starting position for graph
			// dosen't need to be that close to where it needs to be, d3 will make it better
			var xSum = 0;
			node.allParents.forEach(function (nodeParent) {
				var index = nodeParent.prereqs.values.indexOf(node);
				var length = nodeParent.prereqs.values.length;
				if (!nodeParent.x) {
					elog('nodeParent dosent have an x but it was set above?', nodeParent)
				}

				// 300 is the guess distance between nodes
				xSum += ((index - (length - 1) / 2) * 300 + nodeParent.x)

			}.bind(this))

			node.x = xSum / node.allParents.length
		}

		if (node.y === undefined) {
			node.y = treeMgr.getYGuessFromDepth(node.depth)
		}

	}.bind(this))

	nodes.forEach(function (node) {
		this.checkPos(node);
	}.bind(this))

}


Graph.prototype.calculateGraphSize = function () {
	this.graphWidth = this.getSvgWidth();
	this.graphHeight = this.getSvgHeight();

	this.force.size([this.graphWidth, this.graphHeight])

	this.svg.attr("width", this.graphWidth).attr("height", this.graphHeight)
}


Graph.prototype.onTick = function (e) {

	this.nodes.forEach(function (node) {
		this.checkPos(node);
	}.bind(this))


	for (var k = 0; k < this.nodes.length; k++) {
		var currNode = this.nodes[k];

		if (currNode.isCoreq) {
			continue;
		}

		// collision
		for (var j = k + 1; j < this.nodes.length; j++) {
			var testingCollisionAgainst = this.nodes[j];
			if (testingCollisionAgainst.isCoreq) {
				continue;
			}
			this.collide(currNode, testingCollisionAgainst)
		}

		//possible to get the staticly set width and height here, node[0][node.index].lastChild.width.value
		currNode.y += (treeMgr.getYGuessFromDepth(currNode.depth) - currNode.y) * e.alpha * this.yCoordAttractionMultiplyer;


		// collision between children on different depths
		if (!currNode.allChildrenAtSameDepth) {
			for (var i = 0; i < currNode.prereqs.values.length; i++) {
				for (var j = i + 1; j < currNode.prereqs.values.length; j++) {
					if (currNode.prereqs.values[i].depth === currNode.prereqs.values[j].depth) {
						continue;
					}
					var diff = currNode.prereqs.values[i].x - currNode.prereqs.values[j].x;
					if (Math.abs(diff) > 100) {
						continue;
					}
					if (diff < 0) {
						currNode.prereqs.values[i].x -= (100 + diff) / 2;
						currNode.prereqs.values[j].x += (100 + diff) / 2;
					}
					else {
						currNode.prereqs.values[i].x += (100 - diff) / 2;
						currNode.prereqs.values[j].x -= (100 - diff) / 2;
					}
				}
			}
		}
		this.checkPos(currNode);
	};

	this.linkElements.attr("points", function (d) {
		this.checkPos(d.target);
		this.checkPos(d.source);
		return d.target.x + ',' + d.target.y + ' ' + ((d.source.x + d.target.x) / 2) + ',' + ((d.source.y + d.target.y) / 2) + ' ' + d.source.x + ',' + d.source.y
	}.bind(this))

	this.nodeElements.attr("transform", function (node) {
		this.checkPos(node);

		if (node.isCoreq) {

			var x = node.lowestParent.x - node.width / 2;
			var y = node.lowestParent.y - node.height / 2;

			x += (node.coreqIndex + 1) * 30
			y -= (node.coreqIndex + 1) * 39

			return "translate(" + x + "," + y + ")";
		}
		else {
			return "translate(" + (node.x - node.width / 2) + "," + (node.y - node.height / 2) + ")";
		}
	}.bind(this));
}

// This is called when the graph is first loaded, and whenever a panel on the graph is selected. 
Graph.prototype.loadNodes = function (callback) {

	// Release prior nodes and $destroy the scopes
	this.nodes.forEach(function (node) {
		node.foreignObject.remove();
		node.$scope.$destroy();
	}.bind(this))

	// Remove the lines
	while (this.container[0][0].firstChild) {
		this.container[0][0].removeChild(this.container[0][0].firstChild);
	}

	var nodesAndLinks = treeMgr.treeToD3(this.tree);
	this.links = nodesAndLinks.links;
	this.nodes = nodesAndLinks.nodes;

	this.estimateNodePositions();

	this.nodes.forEach(function (node) {
		node.height = this.nodeHeight;
		node.width = this.nodeWidth
	}.bind(this))

	this.linkElements = this.container.selectAll(".link")
		.data(this.links)
		.enter().append("polyline")
		.attr("class", "link")
		.style("stroke-width", 4)
		.attr("marker-mid", "url(#end)");

	for (var i = 0; i < this.links.length; i++) {
		var currLink = this.links[i];

		// find the parent of the two nodes the line connects 
		var parent;
		var child;
		if (currLink.source.depth > currLink.target.depth) {
			parent = currLink.target;
			child = currLink.source;
		}
		else {
			parent = currLink.source;
			child = currLink.target;
		}

		// if should be 'and', make line darker
		if (parent.prereqs.type == 'and') {
			this.linkElements[0][i].style.stroke = '#5B5B5B'
		}

		//add line to both nodes links list
		parent.downwardLinks.push(this.linkElements[0][i])
		child.upwardLinks.push(this.linkElements[0][i])
	}

	var skipThisDrag = false;

	this.nodeDrag = d3.behavior.drag()
		.on("dragstart", function (node) {
			if (d3.event.sourceEvent.which == 3) {
				skipThisDrag = true
				return;
			}
			else if (node.isExpanded) {
				skipThisDrag = true;
				return;
			}
			else if (!node.lowestParent && node.prereqs.values.length === 0) {
				skipThisDrag = true;
				return;
			}
			else {
				skipThisDrag = false;
				this.force.alpha(.007)
			}
		}.bind(this))
		.on("drag", function (node) {
			if (skipThisDrag) {
				return;
			}
			node.px += d3.event.dx
			node.py += d3.event.dy
			node.x += d3.event.dx
			node.y += d3.event.dy
			this.force.alpha(.007)
		}.bind(this))


	this.nodeElements = this.container.selectAll(".node")
		.data(this.nodes)
		.enter().append("g")
		.attr("class", "node")
		.attr("width", this.nodeWidth)
		.attr("height", this.nodeHeight)
		.on("mousedown", function () {
			d3.event.stopPropagation();
		})
		.call(this.nodeDrag)

	// Create the new elements manually, instead of using ng-repeat because ng-repeat is wayyy to slow. 
	var html = '<div ng-include="\'panel.html\'"></div>'

	for (var i = 0; i < this.nodeElements[0].length; i++) {

		// create the new scope for each node
		var newScope = this.$scope.$new();

		// set up the links between tree and scope and foreignObject
		newScope.tree = this.nodes[i]
		this.nodes[i].$scope = newScope


		var foreignObject = d3.select(this.nodeElements[0][i]).append('foreignObject')
			.attr("width", this.nodeWidth)
			.attr("height", this.nodeHeight);

		this.nodes[i].foreignObject = foreignObject[0][0]

		$(foreignObject.append("xhtml:div")[0][0]).append(this.$compile(html)(newScope))

		// Update the height of the svg whenever the height of the panel changes
		// hopefully this isn't to slow...
		newScope.$watch(function ($scope) {
			return $scope.tree.foreignObject.lastChild.offsetHeight
		}.bind(this), function (newVal, oldVal, $scope) {
			if (newVal === oldVal) {
				return;
			}
			this.updateHeight($scope.tree);
		}.bind(this));

		newScope.$watch(function ($scope) {
			return this.getNodeWidth($scope.tree)
		}.bind(this), function (newVal, oldVal, $scope) {
			if (newVal === oldVal) {
				return;
			}
			this.updateWidth($scope.tree);
		}.bind(this));

		// Note that a digest cycle needs to run for this new html to be rendered by the browser. It runs after the current event loop is done because this function is called 
		// inside a digest loop. 
	}

	if (!this.$scope.$$phase) {
		console.error('need to run compile code in a digest loop!')
	}


	// Scope needs to be updated after adding a new scope for each element above
	// This entire fn should be in a setTimeout because of the scope problems, but 
	// that causes conflicts with d3 sometimes running another tick in between when
	// this fn was called and the setTimeout... 
	// this.$scope.$apply();

	this.nodes.forEach(function (node) {
		this.sortCoreqs(node);
	}.bind(this))


	this.force.nodes(this.nodes)
		.links(this.links)

	// This is needed whenever adding or removing nodes from the graph, for d3 internally.
	this.force.start();

	this.force.alpha(.03)

	return callback()

	// Wait until after angular is done compiling the DOM to get the height of DOM elements
	// this.$timeout(function () {
	// 	this.nodes.forEach(function (node) {
			
	// 	}.bind(this));


	// 	// False here prevents another digest cycle from running by this timeout
	// }.bind(this), 0, false);
};


Graph.prototype.go = function (tree, callback) {
	this.isLoading = true;
	downloadTree.fetchFullTree(tree, function (err, tree) {
		this.$scope.$apply(function () {
			this.isLoading = false;
			if (err) {
				return callback(err);
			};


			// Scope needs to be updated in case user went forwards or backwards and it will swap the ng-view
			// setTimeout(function () {
			// this.$scope.$apply()

			treeMgr.go(tree);
			this.tree = tree;

			this.force = d3.layout.force()
				.charge(function (node) {
					return -20000 - node.coreqs.values.length * 7000
				}.bind(this))
				.gravity(0.2)
				.linkDistance(5)

			// Use querySelector instead of getElementById in case this.$document is a document fragment.
			// (It could be in testing and im phantomJS document fragments don't have getElementById but do have querySelector).
			var d3GraphId = d3.select(this.$document[0].querySelector('#d3GraphId'))

			this.svg = d3GraphId.append("svg")

			this.calculateGraphSize();


			// can move this to the same as above? this was a separate #d3graphId selector
			d3GraphId.on("mousedown", function () {
				d3.event.stopPropagation();
			}.bind(this))


			this.container = this.svg.append("g");

			var zoom = d3.behavior.zoom()
				.scaleExtent([.1, 1.5])
				.on("zoom", function () {
					this.container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
				}.bind(this));

			this.svg.call(zoom)

			this.loadNodes(function () {
				this.yCoordAttractionMultiplyer = 1;

				this.classCount = treeMgr.countClassesInTree(tree);
				if (this.classCount === 0) {
					elog('0 classes found?', tree)
				}
				this.force.on('tick', this.onTick.bind(this));

				this.force.start();

				// Two step process:
				// make nodes find the nodes near them
				var safety = 0;
				// D3 cuts off at .005 alpha and freezes everything
				// the higher it is, the faster it loads, but it will not be done when it moves to the next step
				// You'll want to try out different, "small" values for this
				// perhaps make this higher if on slower hardware??
				while (this.force.alpha() > 0.005) {
					this.force.tick();
					if (safety++ > 500) {
						// Avoids infinite looping in case this solution was a bad idea
						break;
					}
				}

				//2. make nodes go towards their depth level
				this.yCoordAttractionMultiplyer = 10;
				this.force.start();

				safety = 0;
				while (this.force.alpha() > 0.01) {
					this.force.tick();
					if (safety++ > 500) {
						break;
					}
				}


				// Center the root node by translating the container <g> inside the svg
				zoom.translate([this.getSvgWidth() / 2 - this.tree.x, 0])

				// Zoom in a little, (this number is arbitrary)
				// zoom.scale(1.16) // DO want to do this, but causes bug where not centered
				zoom.event(this.svg)

				// zoom.center([this.tree.x,this.tree.y])
				// zoom.event(this.svg)


				this.$scope.tree = tree;
				// setTimeout(function () {
				// 	this.$scope.$apply();
				// }.bind(this), 0);
				callback(null, tree)

			}.bind(this))
		}.bind(this))
	}.bind(this))
};

Graph.prototype.createGraph = function (tree, callback) {
	if (!callback) {
		callback = function () {}
	}

	//process tree takes in a callback
	this.go(tree, function (err, tree) {
		if (err) {
			console.log('error processing tree', err, tree);
			return callback(err);
		}

		treeMgr.logTree(tree, {
			type: 'createTree'
		})
		callback(null, tree);
	}.bind(this));
}



Graph.prototype.showClasses = function (classList, callback) {
	if (classList.length < 1) {
		console.log('error show classes was called with 0 classes!')
		return;
	};

	//this is ghetto
	//remove the prereqs from classes so we don't load all the result's prereqs
	classList.forEach(function (aClass) {

		if (aClass.prereqs) {
			aClass.prereqs.values = []
		};

	}.bind(this))



	var treeParams = {
		host: this.$routeParams.host,
		termId: this.$routeParams.termId,
		subject: this.$routeParams.subject,
		prereqs: {
			type: 'or',
			values: classList
		},
		isClass: false,
		hidden: true
	}

	this.go(treeParams, callback)
}


//search


Graph.prototype.getCollegeName = function () {
	return selectorsMgr.college.getText();
};



Graph.prototype.openWatchModel = function ($scope) {
	WatchClassesModel.open(this, $scope.tree)
};


Graph.prototype.Graph = Graph;
module.exports = Graph;
directiveMgr.addController(Graph)
