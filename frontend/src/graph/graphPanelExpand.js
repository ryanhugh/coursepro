'use strict';
var _ = require('lodash')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var treeMgr = require('./treeMgr')


function GraphPanelExpand($timeout, $document) {

	function GraphPanelExpandInner() {

		this.openOrder = []

		$document.keydown(this.onKeyDown.bind(this))
	}

	GraphPanelExpandInner.scope = true;


	GraphPanelExpandInner.prototype.calculatePanelWidth = function (tree) {
		//calculate the width of this tree
		var panelWidth = 0;
		tree.sections.forEach(function (section) {
			if (section.meetings) {
				panelWidth += 330;
			}
			else {
				panelWidth += 185;
			}
		}.bind(this))

		if (panelWidth) {
			panelWidth = Math.min(888, panelWidth)
			if (tree.sections.length < 5) {
				panelWidth = 610;
			};
		}
		else {
			if (tree.desc) {
				panelWidth = tree.desc.length
			}
			else {
				panelWidth = ''
			}
		}
		if (panelWidth < 476) {
			panelWidth = 576
		};
		return panelWidth;
	};

	// the given scope is the scope of a tree inside a recursions
	GraphPanelExpandInner.prototype.updateScope = function (tree, isMouseOver) {

		var $scope = tree.$scope

		if ($scope.isExpanded) {
			$scope.style['box-shadow'] = 'gray 0px 0px 9px'
			$scope.style.cursor = '';
		}
		else {
			$scope.style.cursor = 'pointer';
			if (isMouseOver) {
				$scope.style['box-shadow'] = 'gray 0px 0px 6px'
			}
			else {
				$scope.style['box-shadow'] = 'gray 0px 0px 0px'
			}
		}
		tree.$scope.$apply()
	};


	// if a panel in a tree is clicked
	GraphPanelExpandInner.prototype.onClick = function (tree, callback) {
		if (!callback) {
			callback = function () {}
		};


		//this returns instantly if already loaded
		tree.loadSections(function (err) {
			if (err) {
				console.log("ERROR", err);
				// return callback(err)
			}

			//setTimeout 0 because $scope.$update()
			setTimeout(function () {
				tree.$scope.isExpanded = !tree.$scope.isExpanded;

				//if it failed, toggle isExpanded and update the scope
				if (err) {
					console.log("ERRor loading loadSections", err)
				}
				//if it worked, calculate the panel width
				else if (tree.$scope.isExpanded) {
					var width = this.calculatePanelWidth(tree);
					tree.foreignObject.setAttribute('width', width);
					tree.width = width;

					// find the g element that is a parent of the foreignObject, and move it to the end of its children
					// in svgs this is how zindex works
					var g = tree.foreignObject.parentElement;
					var gParentElement = g.parentElement;
					g.remove();
					gParentElement.appendChild(g)

				}
				else {
					tree.width = 174;
					tree.foreignObject.setAttribute('width', 174)
				}

				//$scope references just the $scope of the tree that was updated, 
				// this.$scope references everything, and contains $scope

				this.updateScope(tree, false);

				//update the dom with the new $scope and tree
				tree.$scope.$apply()

				// update the height of the panel
				tree.height = tree.foreignObject.lastChild.offsetHeight

				// and tell d3 to move the panel back to where it should be
				tree.$scope.graph.force.alpha(.0051)

				callback()
			}.bind(this), 0)
		}.bind(this))
	};


	//called from graph.html 
	GraphPanelExpandInner.prototype.onKeyDown = function (event) {
		if (event.which != 27 || event.type != 'keydown') {
			return;
		};


		var tree = this.openOrder.shift();
		if (!tree) {
			return;
		};
		this.closePanel(tree)
	};

	GraphPanelExpandInner.prototype.openPanel = function (tree, callback) {
		if (tree.$scope.isExpanded || tree.isString) {
			return;
		}

		ga('send', {
			'hitType': 'pageview',
			'page': '/listSections/' + tree.getIdentifer().full.str,
			'title': 'Coursepro.io'
		});


		this.openOrder.push(tree)

		this.onClick(tree, callback)
	};

	GraphPanelExpandInner.prototype.closePanel = function (tree, callback) {
		if (!tree.$scope.isExpanded) {
			return;
		}


		ga('send', {
			'hitType': 'pageview',
			'page': '/closePanel/' + tree.getIdentifer().full.str,
			'title': 'Coursepro.io'
		});


		_.pull(this.openOrder, tree)

		this.onClick(tree, callback)
	};


	GraphPanelExpandInner.prototype.onMouseOver = function (tree) {
		this.updateScope(tree, true);
	}

	GraphPanelExpandInner.prototype.onMouseOut = function (tree) {
		this.updateScope(tree, false);
	};

	// called for each recursive call in graphInner.html
	//this is called once when $scope.tree === undefined, when the root node first loads
	GraphPanelExpandInner.prototype.link = function ($scope, element, attrs) {


		var tree = $scope.tree

		element = element.parent()



		//grab the default z index from the parent $scope, which in intended for this tree

		// z index and shadow both change when expand and on mouse over
		tree.$scope.style = {
			'box-shadow': 'gray 0px 0px 0px',
			cursor: 'pointer'
		}

		if (!tree.lowestParent) {

			this.openOrder = []
		};

		//if only this panel, expand it
		if (!tree.lowestParent && treeMgr.countClassesInTree(tree) === 1) {

			//this is undone when openPanel is done, a couple lines down
			tree.$scope.style.visibility = 'hidden'

			this.openPanel(tree, function (err) {
				if (err) {
					console.log("ERROR", err);
				}

				tree.$scope.style.visibility = ''

				setTimeout(function () {
					tree.$scope.$apply();
				}.bind(this), 0)

			}.bind(this))
		}



		//get the height and width of the document when the page first loads
		// $timeout(function () {

		// 	this.documentHeight = $document.height()
		// 	this.documentWidth = $document.width()
		// }.bind(this))


		element.on('mouseover', function () {
			this.onMouseOver(tree)
		}.bind(this))

		element.on('mouseout', function () {
			this.onMouseOut(tree)
		}.bind(this))

		element.on('click', function () {
			this.openPanel(tree);
		}.bind(this))


		var closeElement = element.find(attrs.panelClose)

		closeElement.on('click', function () {
			this.closePanel(tree);
		}.bind(this))

	}

	var instance = new GraphPanelExpandInner();
	instance.link = instance.link.bind(instance)

	return instance;

}

GraphPanelExpand.fnName = 'GraphPanelExpand'
GraphPanelExpand.$inject = ['$timeout', '$document'];


GraphPanelExpand.prototype.GraphPanelExpand = GraphPanelExpand;
module.exports = GraphPanelExpand;
directiveMgr.addLink(GraphPanelExpand)
