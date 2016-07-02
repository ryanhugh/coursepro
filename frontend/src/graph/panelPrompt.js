'use strict';
var _ = require('lodash')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var treeMgr = require('./treeMgr')


function PanelPrompt() {

	function PanelPromptInner() {

	}

	PanelPromptInner.scope = true;

 
	// if a panel in a tree is clicked
	PanelPromptInner.prototype.onClick = function (tree, callback) {
		if (!callback) {
			callback = function () {}
		};
		tree.showSelectPanel = !tree.showSelectPanel;

		setTimeout(function () {
			tree.$scope.$apply()

			if (tree.showSelectPanel) {
				tree.width = 300
			}
			else {
				tree.width = tree.$scope.graph.nodeWidth
			}
			tree.foreignObject.setAttribute('width', tree.width)
			tree.$scope.graph.updateHeight(tree);
			
			
			callback()
		}.bind(this))
	};


	// PanelPromptInner.prototype.onMouseOver = function (tree) {
	// 	this.updateScope(tree, true);
	// }

	// PanelPromptInner.prototype.onMouseOut = function (tree) {
	// 	this.updateScope(tree, false);
	// };

	//this is called once when $scope.tree === undefined, when the root node first loads
	PanelPromptInner.prototype.link = function ($scope, element, attrs) {

		var tree = $scope.tree

		element = element.parent()

		element.on('click', function () {
			this.onClick(tree);
		}.bind(this))

	}

	var instance = new PanelPromptInner();
	instance.link = instance.link.bind(instance)

	return instance;

}

PanelPrompt.fnName = 'PanelPrompt'
PanelPrompt.$inject = [];


PanelPrompt.prototype.PanelPrompt = PanelPrompt;
module.exports = PanelPrompt;
directiveMgr.addLink(PanelPrompt)
