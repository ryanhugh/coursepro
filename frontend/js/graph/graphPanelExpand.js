'use strict';
var _ = require('lodash')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var popup = require('./popup')



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

	GraphPanelExpandInner.prototype.moveOnScreen = function (tree) {

		document.body.style.height = ''
		document.body.style.width = ''


		//move the panel if it is exending past the top/bottom/left/right of the screen
		//and make page scroll if extending past (top and bottom) or (right and left)

		var coords = $(tree.panel).offset();
		coords.right = tree.panel.offsetWidth + coords.left;
		coords.bottom = tree.panel.offsetHeight + coords.top;



		//don't mess with the dom if panel is not expanded
		if (!tree.$scope.isExpanded) {
			tree.panel.style.marginTop = '';
			tree.panel.style.marginLeft = '';
			return;
		};


		var edgePadding = 30.5
		var topPadding = 82.5

		var topMargin = 0;

		//top also accounts for navbar
		if (coords.top < topPadding) {
			topMargin = topPadding - coords.top
		}

		if (coords.bottom > this.documentHeight - edgePadding) {

			//had to move it down because it was above the top of the screen
			//so extend the bottom of the document
			if (topMargin != 0) {
				document.body.style.height = (tree.panel.offsetHeight + edgePadding + topPadding) + 'px'
			}
			else {
				topMargin = this.documentHeight - edgePadding - coords.bottom
			}
		}
		tree.panel.style.marginTop = topMargin + 'px'



		var minLeftSide = edgePadding;
		var leftMargin = 0;


		if (coords.left < minLeftSide) {
			leftMargin = minLeftSide - coords.left;
		}



		var maxRightSide = this.documentWidth - edgePadding;

		if (coords.right > maxRightSide) {
			if (leftMargin != 0) {
				document.body.style.width = tree.panel.offsetWidth + 'px'
			}
			else {
				leftMargin = maxRightSide - coords.right;
			}
		}
		tree.panel.style.marginLeft = leftMargin + 'px'
	};


	// the given scope is the scope of a tree inside a recursions
	GraphPanelExpandInner.prototype.updateScope = function (tree, isMouseOver) {

		var $scope = tree.$scope

		if ($scope.isExpanded) {
			$scope.style['box-shadow'] = 'gray 0px 0px 9px'
			$scope.style.zIndex = 999;
			$scope.style.cursor = '';
		}
		else {
			$scope.style.cursor = 'pointer';
			if (isMouseOver) {
				$scope.style['box-shadow'] = 'gray 0px 0px 6px'
				$scope.style.zIndex = 150;
			}
			else {
				$scope.style['box-shadow'] = 'gray 0px 0px 0px'
				$scope.style.zIndex = $scope.baseZIndex;
			}
		}
		tree.$scope.$apply()
	};


	// if a panel in a tree is clicked
	GraphPanelExpandInner.prototype.onClick = function (tree) {


		//this returns instantly if already loaded
		tree.loadSections(function (err) {

			//setTimeout 0 because $scope.$update()
			setTimeout(function () {
				tree.$scope.isExpanded = !tree.$scope.isExpanded;

				//if it failed, toggle isExpanded and update the scope
				if (err) {
					console.log("ERRor loading loadSections", err)
				}
				//if it worked, calculate the panel width
				else {
					tree.$scope.panelWidth = this.calculatePanelWidth(tree)

					popup.groupSectionTimes(tree.sections)

					if (tree.lastUpdateTime !== undefined) {
						tree.lastUpdateString = moment(tree.lastUpdateTime).fromNow()
					};
				}

				//$scope references just the $scope of the tree that was updated, 
				// this.$scope references everything, and contains $scope

				this.updateScope(tree, false);

				//update the dom with the new $scope and tree
				tree.$scope.$apply()


				this.moveOnScreen(tree)

			}.bind(this), 0)
		}.bind(this))
	};


	//called from graph.html
	GraphPanelExpandInner.prototype.onKeyDown = function (event) {
		if (!event.code == 27 || !event.type == 'keydown') {
			return;
		};


		var tree = this.openOrder.shift();
		if (!tree) {
			return;
		};
		this.closePanel(tree)
	};

	GraphPanelExpandInner.prototype.openPanel = function (tree) {
		if (tree.$scope.isExpanded) {
			return;
		}

		ga('send', {
			'hitType': 'pageview',
			'page': window.location.href + '/openPopup/' + tree.subject + '/' + tree.classId,
			'title': 'Coursepro.io'
		});


		this.openOrder.push(tree)

		this.onClick(tree)
	};

	GraphPanelExpandInner.prototype.closePanel = function (tree) {
		if (!tree.$scope.isExpanded) {
			return;
		}


		ga('send', {
			'hitType': 'pageview',
			'page': window.location.href + '/closePopup/' + tree.subject + '/' + tree.classId,
			'title': 'Coursepro.io'
		});

		_.pull(this.openOrder, tree)

		this.onClick(tree)
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
		tree.$scope.baseZIndex = tree.$scope.$parent.baseZIndex

		// z index and shadow both change when expand and on mouse over
		tree.$scope.style = {
			'box-shadow': 'gray 0px 0px 0px',
			zIndex: $scope.baseZIndex,
			cursor: 'pointer'
		}



		//get the height and width of the document when the page first loads
		$timeout(function () {

			this.documentHeight = $document.height()
			this.documentWidth = $document.width()
		}.bind(this))


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


GraphPanelExpand.$inject = ['$timeout', '$document'];


GraphPanelExpand.prototype.GraphPanelExpand = GraphPanelExpand;
module.exports = GraphPanelExpand;
directiveMgr.addLink(GraphPanelExpand)