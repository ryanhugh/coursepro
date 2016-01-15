'use strict';

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


function GraphLinker() {

	function GraphLinkerInner() {

	}
	GraphLinkerInner.scope = true;
	GraphLinkerInner.priority = 2;

	GraphLinkerInner.prototype.link = function (scope, element, attrs) {

		//$scope.tree = tree
		//tree.$scope = $scope
		//tree.panel = $element
		scope.tree.$scope = scope
		scope.tree.panel = element[0]

	}


	var instance = new GraphLinkerInner();
	instance.link = instance.link.bind(instance)

	return instance;
}


GraphLinker.prototype.GraphLinker = GraphLinker;
module.exports = GraphLinker;
directiveMgr.addLink(GraphLinker)