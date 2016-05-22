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

	this.graphWidth = window.innerWidth;
	this.graphHeight = window.innerHeight;

	this.nodeWidth = 174
	this.nodeHeight = 50;

	// main d3 force, defined in go
	this.force = null;

	var path = {};

	for (var attrName in this.$routeParams) {
		path[attrName] = decodeURIComponent(this.$routeParams[attrName])
	}

	//if given path, load graph
	if (path.classId && path.subject) {
		this.createGraph(path)
		this.$scope.focusSelector = false;
	}
	else {
		this.$scope.focusSelector = true;
	}


	this.$scope.addClass = this.addClass.bind(this)
}

Graph.$inject = ['$scope', '$routeParams', '$location', '$uibModal', '$compile']

Graph.isPage = true;
Graph.urls = ['/graph/:host/:termId/:subject?/:classId?']
Graph.fnName = 'Graph'

Graph.prototype.addClass = function (aClass) {

	var obj = aClass.getIdentifer().full.obj;

	this.$location.path('/graph/' + encodeURIComponent(obj.host) + '/' + encodeURIComponent(obj.termId) + '/' + encodeURIComponent(obj.subject) + '/' + encodeURIComponent(obj.classId))
};


Graph.prototype.overlap = function (rect1, rect2) {
	if (rect1.x < rect2.x + Math.min(200, rect2.width) &&
		rect1.x + Math.min(200, rect1.width) > rect2.x &&
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

	var dx = Math.min(node1.x + Math.min(200, node1.width) - node2.x, node2.x + Math.min(200, node2.width) - node1.x, 20) / 2;
	if (node1.x < node2.x) {
		node1.x -= dx;
		node2.x += dx;
	}
	else {
		node1.x += dx;
		node2.x -= dx;
	}
};



Graph.prototype.bringToFront = function(tree) {
	
	// find the g element that is a parent of the foreignObject, and move it to the end of its children
	// in svgs this is how zindex works
	var g = tree.foreignObject.parentElement;
	var gParentElement = g.parentElement;
	g.remove();
	gParentElement.appendChild(g)
};



Graph.prototype.go = function (tree, callback) {
	this.isLoading = true;
	downloadTree.fetchFullTree(tree, function (err, tree) {
		this.isLoading = false;
		if (err) {
			return callback(err);
		};

		treeMgr.go(tree);

		var graph = treeMgr.treeToD3(tree)

		this.classCount = treeMgr.countClassesInTree(tree);
		if (this.classCount === 0) {
			elog('0 classes found?', tree)
		}


		this.force = d3.layout.force()
			.charge(-20000)
			.gravity(0.2)
			.linkDistance(5)
			.size([this.graphWidth, this.graphHeight])


		var svg = d3.select("#d3GraphId").append("svg")
			.attr("width", this.graphWidth)
			.attr("height", this.graphHeight)

		// can move this to the same as above? this was a separate #d3graphId selector
		d3.select("#d3GraphId").on("mousedown", function () {
			d3.event.stopPropagation();
		}.bind(this))


		var container = svg.append("g");


		var zoom = d3.behavior.zoom()
			.scaleExtent([.1, 1.5])
			.on("zoom", function () {
				container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
			}.bind(this));

		svg.call(zoom)


		var dragStartedByRightButton = false;
		var nodeDrag = d3.behavior.drag()
			.on("dragstart", function (d, i) {
				if (d3.event.sourceEvent.which == 3) {
					dragStartedByRightButton = true
					return;
				}
				else {
					dragStartedByRightButton = false;
					this.force.alpha(.007)
				}
			}.bind(this))
			.on("drag", function (d, i) {
				if (dragStartedByRightButton) {
					return;
				}
				d.px += d3.event.dx
				d.py += d3.event.dy
				d.x += d3.event.dx
				d.y += d3.event.dy
				this.force.alpha(.007)
			}.bind(this))


		graph.nodes.forEach(function (node) {
			// node.x = node.cx = Math.random() * 100 + 200
			node.height = this.nodeHeight;
			node.width = this.nodeWidth
		}.bind(this))


		var link = container.selectAll(".link")
			.data(graph.links)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-width", 4);

		for (var i = 0; i < graph.links.length; i++) {
			var currLink = graph.links[i];

			// find the parent of the two nodes the line connects 
			var parent;
			var child;
			if (graph.nodes[currLink.source].depth > graph.nodes[currLink.target].depth) {
				parent = graph.nodes[currLink.target];
				child = graph.nodes[currLink.source];
			}
			else {
				parent = graph.nodes[currLink.source];
				child = graph.nodes[currLink.target];
			}

			// if should be 'and', make line darker
			if (parent.prereqs.type == 'and') {
				link[0][i].style.stroke = '#5B5B5B'
			}

			//add line to both nodes links list
			parent.downwardLinks.push(link[0][i])
			child.upwardLinks.push(link[0][i])
		}

		var node = container.selectAll(".node")
			.data(graph.nodes)
			.enter().append("g")
			.attr("class", "node")
			.attr("width", this.nodeWidth)
			.attr("height", this.nodeHeight)
			.on("mousedown", function () {
				d3.event.stopPropagation();
			})
			.call(nodeDrag)

		var html = '<div ng-include="\'panel.html\'"></div>'

		for (var i = 0; i < node[0].length; i++) {

			// create the new scope for each node
			var newScope = this.$scope.$new();

			// set up the links between tree and scope and foreignObject
			newScope.tree = graph.nodes[i]
			graph.nodes[i].$scope = newScope


			var foreignObject = d3.select(node[0][i]).append('foreignObject')
				.attr("width", this.nodeWidth)
				.attr("height", this.nodeHeight);

			graph.nodes[i].foreignObject = foreignObject[0][0]

			$(foreignObject.append("xhtml:div")[0][0]).append(this.$compile(html)(newScope))
		}
		graph.nodes.forEach(function (node) {
			if (node.isCoreq) {
				this.bringToFront(node.lowestParent)
			}
		}.bind(this))

		setTimeout(function () {
			this.$scope.$apply()

			var multiplyer = 1;

			this.force.nodes(graph.nodes)
				.links(graph.links)

			this.force.on("tick", function (e) {
				for (var k = 0; k < graph.nodes.length; k++) {
					var currNode = graph.nodes[k];

					if (currNode.isCoreq) {
						continue;
					}

					// collision
					for (var j = k + 1; j < graph.nodes.length; j++) {
						var testingCollisionAgainst = graph.nodes[j];
						if (testingCollisionAgainst.isCoreq) {
							continue;
						}
						this.collide(currNode, testingCollisionAgainst)
					}

					//possible to get the staticly set width and height here, node[0][node.index].lastChild.width.value
					currNode.y += ((currNode.depth * 200 + 50) - currNode.y) * e.alpha * multiplyer;


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

				};

				link.attr("x1", function (d) {
						return d.source.x;
					}.bind(this))
					.attr("y1", function (d) {
						return d.source.y;
					}.bind(this))
					.attr("x2", function (d) {
						return d.target.x;
					}.bind(this))
					.attr("y2", function (d) {
						return d.target.y;
					}.bind(this));

				node.attr("transform", function (d) {
					if (d.isCoreq) {

						var x = d.lowestParent.x - d.width / 2;
						var y = d.lowestParent.y - d.height / 2;

						x+=(d.coreqIndex+1)*30
						y-=(d.coreqIndex+1)*39

						return "translate(" + x + "," + y + ")";
					}
					else {
						return "translate(" + (d.x - d.width / 2) + "," + (d.y - d.height / 2) + ")";
					}
				}.bind(this));




			}.bind(this))

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
			multiplyer = 10;
			this.force.start();

			safety = 0;
			while (this.force.alpha() > 0.01) {
				this.force.tick();
				if (safety++ > 500) {
					break;
				}
			}

			this.$scope.tree = tree;


			graph.nodes.forEach(function (tree) {
				tree.height = tree.foreignObject.lastChild.offsetHeight
			}.bind(this))

			callback(null, tree)
		}.bind(this), 0)

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
directiveMgr.addDirective(Graph)
