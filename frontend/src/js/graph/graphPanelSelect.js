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

			// Run the entire big tree through all of treeMgr again
			// this is needed to rediscover any common prereqs, recalculate depths, and pretty much 
			// everything else that treeMgr does. 

			// comment from the other code:
			// this is needed because in some cases, nodes can be affected that are children of a select node's ansestors, and that no longer need to have a line
			// to one that was just satisfied, so can make graph simpler for it
			treeMgr.go(tree.$scope.graph.tree) 

			tree.$scope.graph.loadNodes(function () {
				callback()
			}.bind(this))
		}.bind(this))
	};


	GraphPanelSelectInner.prototype.onMouseOver = function (tree) {
		this.updateScope(tree, true);
	}

	GraphPanelSelectInner.prototype.onMouseOut = function (tree) {
		this.updateScope(tree, false);
	};

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