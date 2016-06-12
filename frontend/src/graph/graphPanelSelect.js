'use strict';
var _ = require('lodash')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var treeMgr = require('./treeMgr')
var user = require('../user')


function GraphPanelSelect($timeout, $document) {

	function GraphPanelSelectInner() {

	}

	GraphPanelSelectInner.scope = true;

	GraphPanelSelectInner.prototype.recursiveRemove = function (node) {

		var allParentsAreSatisfied = true;
		node.allParents.forEach(function (parent) {
			if (!parent.isSatisfied && !parent.hidden) {
				allParentsAreSatisfied = false;
			}
		}.bind(this))

		// remove this node
		if (allParentsAreSatisfied) {
			node.$scope.graph.removeFromDom(node);
			node.hidden = true;

			node.prereqs.values.forEach(function (subTree) {
				this.recursiveRemove(subTree)
			}.bind(this))

			node.coreqs.values.forEach(function (subTree) {
				this.recursiveRemove(subTree)
			}.bind(this))
		}
	};

	GraphPanelSelectInner.prototype.selectTree = function (tree) {
		var graph = tree.$scope.graph
		tree.allParents.forEach(function (parent) {
			if (parent.prereqs.type == 'or') {
				parent.isSatisfied = true;
			}
		}.bind(this))


		var neighbors = treeMgr.getUpwardNeighbors(tree);

		_.pull(neighbors, tree);

		neighbors.forEach(function (node) {

			this.recursiveRemove(node)
		}.bind(this))




		graph.force.nodes(graph.nodes)
			.links(graph.links)


	};


	// if a panel in a tree is clicked
	GraphPanelSelectInner.prototype.onClick = function (tree, callback) {
		if (!callback) {
			callback = function () {}
		};

		user.toggleListContainsClass('selected', tree, false, function (err) {
			if (err) {
				elog(err);
				return;
			}
			treeMgr.onNodeSelect(tree.$scope.graph.tree) // the BIG TREE

			graph.loadNodes(false, function () {
				callback()
			}.bind(this))
		}.bind(this))

		// // going to move to user
		// if (!tree.isSelected) {
		// 	tree.isSelected = true;
		// 	this.selectTree(tree)
		// }


	};


	GraphPanelSelectInner.prototype.onMouseOver = function (tree) {
		this.updateScope(tree, true);
	}

	GraphPanelSelectInner.prototype.onMouseOut = function (tree) {
		this.updateScope(tree, false);
	};

	// called for each recursive call in graphInner.html
	//this is called once when $scope.tree === undefined, when the root node first loads
	GraphPanelSelectInner.prototype.link = function ($scope, element, attrs) {

		var tree = $scope.tree

		element = element.parent()

		element.on('click', function () {
			this.onClick(tree);
		}.bind(this))

	}

	var instance = new GraphPanelSelectInner();
	instance.link = instance.link.bind(instance)

	return instance;

}

GraphPanelSelect.fnName = 'GraphPanelSelect'
GraphPanelSelect.$inject = ['$timeout', '$document'];


GraphPanelSelect.prototype.GraphPanelSelect = GraphPanelSelect;
module.exports = GraphPanelSelect;
directiveMgr.addLink(GraphPanelSelect)
