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

Graph.$inject = ['$scope', '$routeParams', '$location', '$uibModal']

Graph.isPage = true;
Graph.urls = ['/graph/:host/:termId/:subject?/:classId?']
Graph.fnName = 'Graph'

Graph.prototype.addClass = function (aClass) {

	var obj = aClass.getIdentifer().full.obj;

	this.$location.path('/graph/' + encodeURIComponent(obj.host) + '/' + encodeURIComponent(obj.termId) + '/' + encodeURIComponent(obj.subject) + '/' + encodeURIComponent(obj.classId))
		// this.createGraph()
};


Graph.prototype.overlap = function (rect1, rect2) {
	if (rect1.x < rect2.x + this.nodeWidth &&
		rect1.x + this.nodeWidth > rect2.x &&
		rect1.y < rect2.y + this.nodeHeight &&
		this.nodeHeight + rect1.y > rect2.y) {
		return true;
	}
	else {
		return false;
	}
}


Graph.prototype.collide = function (node) {
	var padding = 0;
	var nx1 = node.x - padding;
	var nx2 = node.x2() + padding;
	var ny1 = node.y - padding;
	var ny2 = node.y2() + padding;
	return function (quad, x1, y1, x2, y2) {
		// var dy;
		if (quad.point && (quad.point !== node)) {
			if (this.overlap(node, quad.point)) {
				// dy = Math.min(node.y2() - quad.point.y, quad.point.y2() - node.y) / 4;
				// node.y -= dy;
				// quad.point.y += dy;
				var dx = Math.min(node.x2() - quad.point.x, quad.point.x2() - node.x) / 2;
				if (isNaN(dx)) {
					debugger
					dx=0
				}
				node.x -= dx;
				quad.point.x += dx;
			}
		}
		return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
	}.bind(this);
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


		var force = d3.layout.force()
			.charge(-18000)
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
			.scaleExtent([1, 10])
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
					force.alpha(.007)
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
				force.alpha(.007)
			}.bind(this))


		graph.nodes.forEach(function (node) {
			// node.x = node.cx = Math.random() * 100 + 200
			node.y = node.cy = node.depth * 200 + 50
			node.x2 = function () {
				return node.x + this.nodeWidth
			}.bind(this)
			node.y2 = function () {
				return node.y + this.nodeHeight
			}.bind(this)
		}.bind(this))


		var link = container.selectAll(".link")
			.data(graph.links)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-width", 4);


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

		node.html('<foreignObject width="' + this.nodeWidth + '" height="' + this.nodeHeight + '"><div class="panel panel-primary"> <div class="panel-heading"> <h3 class="panel-title">Panel title</h3> </div> <div class="panel-body"> Panel content </div> </div></foreignObject>')


		for (var i = 0; i < node[0].length; i++) {
			node[0][i].querySelector('.panel-title').innerText = graph.nodes[i].name
		}

		var multiplyer = 1;

		var tick = (function tick(e) {
			var q = d3.geom.quadtree(graph.nodes);
			var i = 0;
			var n = graph.nodes.length;
			while (++i < n) {
				q.visit(this.collide(graph.nodes[i]));
			}

			graph.nodes.forEach(function (o, i) {
				//possible to get the staticly set width and height here, node[0][o.index].lastChild.width.value
				o.y += ((o.depth * 200 + 50) - o.y) * e.alpha * multiplyer;
			}.bind(this));

			link.attr("x1", function (d) {
					return d.source.x + this.nodeWidth / 2;
				}.bind(this))
				.attr("y1", function (d) {
					return d.source.y + this.nodeHeight / 2;
				}.bind(this))
				.attr("x2", function (d) {
					return d.target.x + this.nodeWidth / 2;
				}.bind(this))
				.attr("y2", function (d) {
					return d.target.y + this.nodeHeight / 2;
				}.bind(this));

			node.attr("transform", function (d) {
				return "translate(" + d.x + "," + d.y + ")";
			}.bind(this));
		}).bind(this)

		force
			.nodes(graph.nodes)
			.links(graph.links)
			.on("tick", tick)
			.start();

		// return;

		// Two step process:
		// make nodes find the nodes near them
		var safety = 0;
		// D3 cuts off at .005 alpha and freezes everything
		// the higher it is, the faster it loads, but it will not be done when it moves to the next step
		// You'll want to try out different, "small" values for this
		// perhaps make this higher if on slower hardware??
		while (force.alpha() > 0.08) {
			force.tick();
			if (safety++ > 500) {
				// Avoids infinite looping in case this solution was a bad idea
				break;
			}
		}
		// console.log(safety);

		//2. make nodes go towards their depth level
		multiplyer = 10;
		force.start();

		safety = 0;
		while (force.alpha() > 0.01) {
			force.tick();
			if (safety++ > 500) {
				break;
			}
		}
		// console.log(safety);



		setTimeout(function () {
			this.$scope.$apply()
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
