'use strict';
var _ = require('lodash')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var treeMgr = require('./treeMgr')
var user = require('../user')

function GraphPanelExpand($timeout, $document) {

	function GraphPanelExpandInner() {

		this.openOrder = []

		$document.keydown(this.onKeyDown.bind(this))
	}

	GraphPanelExpandInner.scope = true;

	GraphPanelExpandInner.prototype.bringExpandedPanelsToFront = function() {
		this.openOrder.forEach(function (tree) {
			tree.$scope.graph.bringToFront(tree);
		}.bind(this))
	};

	GraphPanelExpandInner.prototype.increaseShowing = function(tree) {
		tree.showingSectionCount+=10;
		setTimeout(function () {
			tree.$scope.graph.updateHeight(tree)
		}.bind(this),0)
	};


	GraphPanelExpandInner.prototype.calculatePanelWidth = function (tree) {

		if (tree.sections.length > 0) {
			return 780;
		}
		else {
			return Math.max(576, Math.min(780, tree.desc.length))
		}
	};

	GraphPanelExpandInner.prototype.getTreePanel = function(tree) {
		var panels = tree.foreignObject.getElementsByClassName('treePanel');
		if (panels.length != 1) {
			elog('should be 1 panel per node')
		}
		return panels[0];
	};

	GraphPanelExpandInner.prototype.getNodeIsSelected = function(tree) {
		return user.getListIncludesClass('selected',tree);
	};

	// the given scope is the scope of a tree inside a recursions
	GraphPanelExpandInner.prototype.updateScope = function (tree, isMouseOver) {
		if (isMouseOver) {
			this.setUpwardLines(tree, 8)
			this.setDownwardLines(tree, 8)
		}
		else {
			this.setUpwardLines(tree, 4)
			this.setDownwardLines(tree, 4)
		}


		if (!tree.showSelectPanel) {

			// Manually change the style of the node because AngularJS is just too slow. 
			var panel = this.getTreePanel(tree);
			if (tree.isExpanded) {
				panel.style['box-shadow'] = 'gray 0px 0px 9px'
				panel.style.cursor = '';
			}
			else {
				panel.style.cursor = 'pointer';
				if (isMouseOver) {
					panel.style['box-shadow'] = 'gray 0px 0px 6px'
				}
				else {
					panel.style['box-shadow'] = 'gray 0px 0px 0px'
				}
			}
		}

		// Run these regardless if the showSelctedPanel is shown or not
		if (!tree.isExpanded) {
			if (isMouseOver) {
				tree.$scope.graph.bringToFront(tree)
			}
			else if (tree.isCoreq) {
				tree.$scope.graph.sortCoreqs(tree.lowestParent)
			}

			this.bringExpandedPanelsToFront()

		}
	};


	// if a panel in a tree is clicked
	GraphPanelExpandInner.prototype.onExpandClick = function (tree, callback) {
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
				tree.isExpanded = !tree.isExpanded;
				tree.showSelectPanel = false;

				//if it failed, toggle isExpanded and update the scope
				if (err) {
					console.log("ERRor loading loadSections", err)
				}
				//if it worked, calculate the panel width
				else if (tree.isExpanded) {
					tree.width = this.calculatePanelWidth(tree);
				}
				else {
					tree.width = tree.$scope.graph.nodeWidth;
				}
				tree.foreignObject.setAttribute('width', tree.width)

				//$scope references just the $scope of the tree that was updated, 
				// this.$scope references everything, and contains $scope


				//update the dom with the new $scope and tree
				tree.$scope.$apply()

				this.updateScope(tree, false);

				tree.$scope.graph.updateHeight(tree)

				// and tell d3 to move the panel back to where it should be
				tree.$scope.graph.force.alpha(.0051)

				callback()
			}.bind(this), 0)
		}.bind(this))
	};

	GraphPanelExpandInner.prototype.togglePanelPrompt = function (tree, callback) {
		setTimeout(function () {
			clearTimeout(tree.graphPanelPromptTimeout);
			tree.showSelectPanel = !tree.showSelectPanel;
			tree.$scope.$apply()

			if (tree.showSelectPanel) {
				tree.width = 300
			}
			else {
				tree.width = tree.$scope.graph.nodeWidth
			}
			tree.foreignObject.setAttribute('width', tree.width)
			tree.$scope.graph.updateHeight(tree);

			// and tell d3 to move the panel back to where it should be
			tree.$scope.graph.force.alpha(.0051)

			callback()
		}.bind(this), 0)
	};

	GraphPanelExpandInner.prototype.openPanelPrompt = function (tree, callback) {
		if (!callback) {
			callback = function () {}
		};
		if (tree.isExpanded || tree.showSelectPanel) {
			return callback();
		}
		this.togglePanelPrompt(tree, callback);
		this.updateScope(tree, true)
	};

	GraphPanelExpandInner.prototype.closePanelPrompt = function (tree, callback) {
		if (!callback) {
			callback = function () {}
		};
		if (tree.isExpanded || !tree.showSelectPanel) {
			return callback()
		}
		this.togglePanelPrompt(tree, callback);
		setTimeout(function () {
			this.updateScope(tree, false);
		}.bind(this),0)
	};



	// if a panel in a tree is clicked
	GraphPanelExpandInner.prototype.onPanelSelect = function (tree, callback) {
		if (!callback) {
			callback = function () {}
		};

		// Selecting this node will not change the tree, don't allow it to be selected.
		if (!tree.wouldSatisfyNode && !user.getListIncludesClass('selected', tree)) {
			return callback();
		}


		user.toggleListContainsClass('selected', tree, false, function (err) {
			if (err) {
				elog(err);
				return;
			}
			setTimeout(function () {

				// Run the entire big tree through all of treeMgr again
				// this is needed to rediscover any common prereqs, recalculate depths, and pretty much 
				// everything else that treeMgr does. 

				// comment from the other code:
				// this is needed because in some cases, nodes can be affected that are children of a select node's ansestors, and that no longer need to have a line
				// to one that was just satisfied, so can make graph simpler for it
				treeMgr.go(tree.$scope.graph.tree)
				tree.$scope.graph.loadNodes(function () {

					// After all the graph stuff is done, shink this panel back to avoid the redraw
					tree.showSelectPanel = false;
					tree.isExpanded = false;
					tree.$scope.$apply();
					tree.$scope.graph.updateHeight(tree)
					clearTimeout(tree.graphPanelPromptTimeout);
					callback()
				}.bind(this))
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
		if (tree.isExpanded || tree.isString) {
			return;
		}

		ga('send', {
			'hitType': 'pageview',
			'page': '/listSections/' + tree.getIdentifer().full.str,
			'title': 'Coursepro.io'
		});


		this.openOrder.push(tree)

		this.onExpandClick(tree, callback)
	};

	GraphPanelExpandInner.prototype.closePanel = function (tree, callback) {
		if (!tree.isExpanded) {
			return;
		}

		ga('send', {
			'hitType': 'pageview',
			'page': '/closePanel/' + tree.getIdentifer().full.str,
			'title': 'Coursepro.io'
		});

		_.pull(this.openOrder, tree)

		this.onExpandClick(tree, callback)
	};

	GraphPanelExpandInner.prototype.setUpwardLines = function (tree, lineWidth) {

		var linesToSkip = [];
		tree.allParents.forEach(function (parent) {
			if (parent.prereqs.type == 'and' && !tree.isClass) {
				linesToSkip = linesToSkip.concat(parent.downwardLinks)
				return;
			}
			if (parent.isClass) {
				return;
			}
			this.setUpwardLines(parent, lineWidth)
		}.bind(this))

		tree.upwardLinks.forEach(function (link) {
			if (_(linesToSkip).includes(link)) {
				return;
			}
			link.style.strokeWidth = lineWidth + 'px';
		}.bind(this));


	};

	GraphPanelExpandInner.prototype.setDownwardLines = function (tree, lineWidth) {
		tree.downwardLinks.forEach(function (link) {
			link.style.strokeWidth = lineWidth + 'px';
		}.bind(this));

		tree.prereqs.values.forEach(function (child) {
			if (child.isClass) {
				return;
			}
			this.setDownwardLines(child, lineWidth)
		}.bind(this))
	};


	GraphPanelExpandInner.prototype.onMouseOver = function (tree) {
		this.updateScope(tree, true);
	}

	GraphPanelExpandInner.prototype.onMouseOut = function (tree) {
		this.updateScope(tree, false);
	};

	GraphPanelExpandInner.prototype.startPromptTimer = function (tree, event) {
		clearTimeout(tree.graphPanelPromptTimeout);
		if (tree.isCoreq) {
			return;
		}
		tree.graphPanelPromptTimeout = setTimeout(function () {
			var coords = tree.foreignObject.getBoundingClientRect();
			// If graph is still where the mouse used to be
			// (cannot get current mouse pos without another event)
			if (event.clientX < coords.left) {
				return;
			}
			else if (event.clientX > coords.right) {
				return;
			}
			else if (event.clientY < coords.top) {
				return;
			}
			else if (event.clientY > coords.bottom) {
				return;
			}
			else {
				this.openPanelPrompt(tree);
			}
		}.bind(this), 1500)
	};

	//this is called once when $scope.tree === undefined, when the root node first loads
	GraphPanelExpandInner.prototype.link = function ($scope, element, attrs) {
		$scope.graphPanelExpand = this;

		var tree = $scope.tree

		element = element.parent()

		if (!tree.lowestParent) {
			this.openOrder = []
		};

		//if only this panel, expand it
		if (!tree.lowestParent && treeMgr.countClassesInTree(tree) === 1) {

			//this is undone when openPanel is done, a couple lines down
			var panel = this.getTreePanel(tree);
			panel.style.visibility = 'hidden'

			this.openPanel(tree, function (err) {
				if (err) {
					elog(err);
				}

				panel.style.visibility = ''
			}.bind(this))
		}

		element.on('mouseover', function (event) {
			this.onMouseOver(tree)
			this.startPromptTimer(tree, event);
		}.bind(this))

		element.on('mousemove', function (event) {
			this.startPromptTimer(tree, event);
		}.bind(this))

		element.on('mouseout', function () {
			clearTimeout(tree.graphPanelPromptTimeout);
			this.onMouseOut(tree)
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
