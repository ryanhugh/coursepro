/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

'use strict';
var _ = require('lodash')
var macros = require('../macros')
var d3 = require('d3')

// base angular stuff
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../data/user')

//tree stuff
var downloadTree = require('./downloadTree')
var treeMgr = require('./treeMgr')
var Node = require('./Node')
var Class = require('../data/Class')

var Search = require('../search/search')
var SelectHelpModel = require('../selectHelpModel/selectHelpModel')
var WatchClassesModel = require('../watchClassesModel/watchClassesModel')


//thing that calls on download tree, treeMgr, render, popup and help
//manages the page that generates the tree graphs

function Graph() { 
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.graphWidth = this.getSvgWidth();

	this.graphHeight = this.getSvgHeight();


	// main d3 force, defined in go
	this.force = null;

	// the svg element, defined in go
	this.svg = null;

	// The zoom d3 object. 
	// Used to zoom and pan around. 
	this.zoom = null;

	// the container, which is the only child of the svg, defined in go
	this.container = null;

	this.links = []
	this.linkElements = null;

	this.nodes = []

	// When calculating the position of all the nodes for the first time, 
	// initially, focus more on grouping similar nodes together,
	// and then increase the y multiplyer to move the nodes to the correct y coordinate. 
	this.yCoordAttractionMultiplyer = 1;

	this.$scope.user = user;

	var path = {};

	for (var attrName in this.$routeParams) {
		path[attrName] = decodeURIComponent(this.$routeParams[attrName])
	}

	//if given path, load graph
	setTimeout(function () {
		if (path.classUid && path.subject) {
			this.createGraph(path)
		}
		else {
			this.searchFromObj(path)
		}
	}.bind(this), 0);

	this.$scope.$on('$destroy', function () {
		this.hideHelpTooltips()
		if (this.force) {
			this.force.stop();
		}
	}.bind(this))

	this.$window.addEventListener('resize', function () {
		this.calculateGraphSize();
	}.bind(this))
}


macros.inherent(BaseDirective, Graph)

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


Graph.prototype.onPanZoonButtonClick = function (deltaScale) {
	if (!this.rootNode) {
		return;
	}
	var currScale = this.zoom.scale()
	this.zoom.scale(currScale + deltaScale);
	this.zoom.event(this.svg)
};

Graph.prototype.getWidth = function (node) {
	var width = Math.min(200, macros.NODE_WIDTH);
	if (node.coreqs.values.length > 0) {
		width += node.coreqs.values.length * 34
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
		node.checkPos();
	}.bind(this))

}


Graph.prototype.calculateGraphSize = function () {
	if (!this.force) {
		return;
	}

	this.graphWidth = this.getSvgWidth();
	this.graphHeight = this.getSvgHeight();

	this.force.size([this.graphWidth, this.graphHeight])

	this.svg.attr("width", this.graphWidth).attr("height", this.graphHeight)
}


Graph.prototype.onTick = function (e) {

	this.nodes.forEach(function (node) {
		node.checkPos();
	}.bind(this))


	for (var k = 0; k < this.nodes.length; k++) {
		var currNode = this.nodes[k];

		if (currNode.isCoreq || currNode.isExpanded) {
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
		// TODO: this needs to be converted to actual trig that makes sure that the angle between any two parents or any two children is not too small.
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
		currNode.checkPos();
	};

	this.linkElements.attr("points", function (d) {
		d.target.checkPos();
		d.source.checkPos();
		return d.target.x + ',' + d.target.y + ' ' + ((d.source.x + d.target.x) / 2) + ',' + ((d.source.y + d.target.y) / 2) + ' ' + d.source.x + ',' + d.source.y
	}.bind(this))

	this.nodes.forEach(function (node) {
		node.checkPos();
		node.updatePos();
	}.bind(this));
}

Graph.prototype.showHelpTooltips = function () {
	if (user.getValue(macros.EXPANDED_PANEL_ONCE) || (this.rootNode.prereqs.values.length === 0 && this.rootNode.coreqs.values.length === 0)) {
		this.hideHelpTooltips();
		return;
	}

	if (!this.rootNode || !this.rootNode.foreignObject) {
		return;
	}

	// If a panel has never been expanded, show a help tooltip above the root node
	var panel = this.rootNode.foreignObject.querySelector('.panel');

	var toolTip = $(panel).tooltip({
		container: 'body',
		html: 'true',
		placement: 'left',
		trigger: 'manual',
		title: '<span style="font-size:18px">Click to expand</span>',
	})

	this.timeout(function () {
		toolTip.tooltip('show')
	}.bind(this), 100)
};

// Hide the help tooltip over the root node created by showHelpTooltips.
Graph.prototype.hideHelpTooltips = function () {
	if (!this.rootNode || !this.rootNode.foreignObject) {
		return;
	}
	var panel = this.rootNode.foreignObject.querySelector('.panel');
	$(panel).tooltip('hide')
};



// This is called when the graph is first loaded, and whenever a panel on the graph is selected. 
Graph.prototype.loadNodes = function (callback) {

	// Release prior nodes and $destroy the scopes
	this.nodes.forEach(function (node) {
		node.foreignObject.remove();
		node.$scope.$destroy();
	}.bind(this))

	// Remove everything else from the container
	while (this.container[0][0].firstChild) {
		this.container[0][0].removeChild(this.container[0][0].firstChild);
	}

	var nodesAndLinks = treeMgr.treeToD3(this.rootNode);
	this.links = nodesAndLinks.links;
	this.nodes = nodesAndLinks.nodes;

	this.estimateNodePositions();

	this.nodes.forEach(function (node) {
		node.height = macros.NODE_HEIGHT;
		node.width = macros.NODE_WIDTH
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
			else {
				node.px += d3.event.dx
				node.py += d3.event.dy
				node.x += d3.event.dx
				node.y += d3.event.dy
				this.force.alpha(.007)
			}
		}.bind(this))


	this.nodeElements = this.container.selectAll(".node")
		.data(this.nodes)
		.enter().append("g")
		.attr("class", "node")
		.attr("width", macros.NODE_WIDTH)
		.attr("height", macros.NODE_HEIGHT)
		.on("mousedown", function (node) {
			if (!node.isExpanded) {
				d3.event.stopPropagation();
			}
		})
		.on("dblclick", function () {
			d3.event.stopPropagation();
		})
		.call(this.nodeDrag)

	// Create the new elements manually, instead of using ng-repeat because ng-repeat is wayyy to slow. 
	var html = '<div ng-include="\'panel.html\'"></div>'

	for (var i = 0; i < this.nodeElements[0].length; i++) {

		// create the new scope for each node
		var newScope = this.$scope.$new();

		// set up the links between tree and scope and foreignObject
		newScope.node = this.nodes[i]
		this.nodes[i].$scope = newScope

		var foreignObject = d3.select(this.nodeElements[0][i]).append('foreignObject')
			.attr("width", macros.NODE_WIDTH)
			.attr("height", macros.NODE_HEIGHT);

		this.nodes[i].foreignObject = foreignObject[0][0]

		$(foreignObject.append("xhtml:div")[0][0]).append(this.$compile(html)(newScope))
	}

	// Scope needs to be updated after adding a new scope for each element above
	// This entire fn should be in a setTimeout because of the scope problems, but 
	// that causes conflicts with d3 sometimes running another tick in between when
	// this fn was called and the setTimeout. Also, don't bother running this.$scope.$apply
	// or newScope.$apply because the $apply runs on the $rootScope and updates all scopes in the entire page. 
	this.$scope.$apply();

	// Update height, width after digest loop
	// sorting the coreqs can be done whenever
	this.nodes.forEach(function (node) {
		node.updateWidth();
		node.updateHeight();
		node.sortCoreqs();
	}.bind(this));

	this.showHelpTooltips()

	this.force.nodes(this.nodes)
		.links(this.links)

	// This is needed whenever adding or removing nodes from the graph, for d3 internally.
	this.force.start();

	this.force.alpha(.03)

	return callback()
};

Graph.prototype.searchFromObj = function (obj) {
	var query = []
	if (obj.subject) {
		query.push(obj.subject)
	}
	if (obj.classUid) {
		query.push(obj.classUid)
	}

	if (Search.instance) {
		Search.setSearchText(query.join(' '))
		Search.instance.go()
	}
	else {
		elog('And search.instance isnt valid')
	}
};


Graph.prototype.go = function (config, callback) {
	if (!callback) {
		callback = function () {}
	}


	var rootClass = Class.create(config);
	if (!rootClass) {
		this.searchFromObj(config)
		elog('Invalid class creation data')
		return callback('Invalid subject + classId given, sending to search')
	}

	rootClass.download(function (err) {
		if (err) {
			elog(err)
			return callback(err)
		}

		if (rootClass.dataStatus === macros.DATASTATUS_FAIL) {
			// Invalid config, log error with server and redirect to search
			this.searchFromObj(config)
			return callback('Invalid subject + classId given, sending to search')
		}

		downloadTree.fetchFullTree(rootClass, function (err, rootClass) {
			setTimeout(function () {
				if (err) {
					return callback(err);
				};


				var rootNode = Node.create(rootClass);

				// Scope needs to be updated in case user went forwards or backwards and it will swap the ng-view
				// setTimeout(function () {
				// this.$scope.$apply()

				treeMgr.go(rootNode);
				this.rootNode = rootNode;

				if (this.force) {
					this.force.stop();
				}

				this.force = d3.layout.force()
					.charge(function (node) {
						return -20000 - node.coreqs.values.length * 7000
					}.bind(this))
					.gravity(0.2)
					.linkDistance(5)

				// Use querySelector instead of getElementById in case this.$document is a document fragment.
				// (It could be in testing and in phantomJS document fragments don't have getElementById but do have querySelector).
				var d3GraphId = d3.select(this.$document[0].querySelector('#d3GraphId'))

				this.svg = d3GraphId.append("svg")

				this.calculateGraphSize();


				// can move this to the same as above? this was a separate #d3graphId selector
				d3GraphId.on("mousedown", function () {
					d3.event.stopPropagation();
				}.bind(this))


				this.container = this.svg.append("g");

				this.zoom = d3.behavior.zoom()
					.scaleExtent([.1, 1.5])
					.on('zoomstart', function () {

						// Hide the help tooltips
						this.hideHelpTooltips()

					}.bind(this))
					.on("zoom", function () {
						this.container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
					}.bind(this))
					.on('zoomend', function () {
						// Only show the tooltip if zoomed in to some degree
						if (this.zoom.scale() > .6) {
							this.showHelpTooltips()
						}
					}.bind(this));

				this.svg.call(this.zoom)

				this.loadNodes(function () {
					this.yCoordAttractionMultiplyer = 1;

					this.classCount = treeMgr.countClassesInTree(rootNode);
					if (this.classCount === 0) {
						elog('0 classes found?', rootNode)
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
					this.zoom.translate([this.getSvgWidth() / 2 - this.rootNode.x, 0])
					this.zoom.event(this.svg)
					callback(null, this.rootNode)
				}.bind(this))
			}.bind(this), 0)
		}.bind(this))
	}.bind(this))
};

Graph.prototype.createGraph = function (config, callback) {
	if (!callback) {
		callback = function () {}
	}

	//process tree takes in a callback
	this.go(config, function (err, rootNode) {
		if (err) {
			elog('processing graph', err, config);
			return callback(err);
		}

		treeMgr.logRootNode(rootNode, {
			type: 'createGraph'
		})
		callback(null, rootNode);
	}.bind(this));
}

Graph.prototype.moveNodeOnScreen = function (node) {

	var padding = 20;
	var additionalTopPadding = 50;
	var bounds = this.svg[0][0].getBoundingClientRect()
	var deltaY = 0;
	var deltaX = 0;
	var coords = node.foreignObject.getBoundingClientRect()
	if (coords.top < padding + bounds.top) {
		deltaY = padding + bounds.top - coords.top
	}
	else if (coords.top + coords.height > bounds.height + bounds.top - padding) {
		deltaY = bounds.height + bounds.top - padding - coords.top - coords.height
		if (-deltaY > coords.top - padding - additionalTopPadding) {
			deltaY = -(coords.top - padding - additionalTopPadding);
		}
	}

	if (coords.left < padding + bounds.left) {
		deltaX = padding + bounds.left - coords.left
	}
	else if (coords.left + coords.width > bounds.width + bounds.left - padding) {
		deltaX = bounds.width + bounds.left - padding - coords.left - coords.width
	}

	var currPos = this.zoom.translate()


	// Center the root node by translating the container <g> inside the svg
	this.zoom.translate([deltaX + currPos[0], deltaY + currPos[1]])
	this.zoom.event(this.svg)
};




Graph.prototype.getCollegeName = function () {
	return selectorsMgr.college.getText();
};



Graph.prototype.openWatchModel = function (node) {
	WatchClassesModel.open(this, node)
};


Graph.prototype.openSelectHelpModel = function () {
	SelectHelpModel.open(this)
}


Graph.prototype.Graph = Graph;
module.exports = Graph;
directiveMgr.addController(Graph)
