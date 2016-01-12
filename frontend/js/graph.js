'use strict';
var moment = require('moment')

var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')

var downloadTree = require('./downloadTree')
var treeMgr = require('./treeMgr')
var render = require('./render')
var popup = require('./popup')
var help = require('./help')
var Class = require('./Class')
var macros = require('./macros')


//thing that calls on download tree, treeMgr, render, popup and help
//manages the page that generates the tree graphs

function Graph($scope, $routeParams, $document) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.graph = this;

	//need to get the macros to the html somehow...
	this.macros = macros;

	this.openOrder = []


	this.createGraph($routeParams)

	$document.keydown(this.onKeyDown.bind(this))

}

Graph.isPage = true;
Graph.url = '/graph/:host/:termId/:subject/:classId'


Graph.prototype.setupUUIDLinks = function (tree) {

	tree.panel = document.getElementById(tree.uuid)

	tree.prereqs.values.forEach(function (subTree) {
		this.setupUUIDLinks(subTree);
	}.bind(this));

	tree.coreqs.values.forEach(function (subTree) {
		this.setupUUIDLinks(subTree);
	}.bind(this));
};

Graph.prototype.getCoords = function (tree) {

	var coords = tree.panel.getBoundingClientRect();

	tree.x = coords.left + tree.panel.offsetWidth / 2 + document.body.scrollLeft;
	tree.y = coords.bottom - tree.panel.offsetHeight / 2 + document.body.scrollTop;

	tree.prereqs.values.forEach(function (subTree) {
		this.getCoords(subTree);
	}.bind(this));

	tree.coreqs.values.forEach(function (subTree) {
		this.getCoords(subTree);
	}.bind(this));
};

Graph.prototype.go = function (tree, callback) {
	this.isLoading = true;
	downloadTree.fetchFullTree(tree, function (err, tree) {
		setTimeout(function () {



			this.isLoading = false;

			if (err) {
				return callback(err);
			};

			treeMgr.go(tree);


			// render.go(tree);
			// popup.go(tree);
			// help.go(tree);
			// this.tree = tree;
			//SOMEWHERE ENsure that all class have prettyurl, and if not copy over url

			this.$scope.tree = tree;
			this.$scope.$apply()

			this.setupUUIDLinks(tree)
			this.getCoords(tree);
			render.addLines(tree);


			// if two giant trees are off screen, pick one and scroll to it
			// so something is on the screen when the loading finishes
			// http://localhost/#neu.edu/201630/EECE/4792
			if (tree.hidden && tree.prereqs.values.length > 0 && (tree.prereqs.values.length % 2) == 0) {

				//scroll to one of sub trees
				var x = tree.prereqs.values[parseInt(tree.prereqs.values.length / 2)].x
				window.scrollTo(x - $(window).width() / 2, document.body.scrollTop);
			}
			else {
				//scroll to the middle of the page, and don't touch the scroll height
				window.scrollTo(document.body.scrollWidth / 2 - $(window).width() / 2, document.body.scrollTop);
			}

		}.bind(this), 0)

		callback(null, tree)
	}.bind(this))
};

Graph.prototype.createGraph = function (tree, callback) {
	if (!callback) {
		callback = function () {}
	}

	// var tree = Class.create(serverData)

	// if (!tree) {
	// 	console.log('ERROR failed to create tree with ',host,termId,subject,classId)
	// 	console.trace()
	// 	return callback('error')
	// };

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


	tree.prereqs.values = classList

	tree.host = classList[0].host
	tree.termId = classList[0].termId

	//hide the node for search
	// this must be false - 
	tree.hidden = true;


	tree = downloadTree.convertServerData(tree);

	//this is ghetto
	//remove the prereqs of the class given so they dont have trees coming down from them
	tree.prereqs.values.forEach(function (subTree) {
		subTree.prereqs.values = []
	}.bind(this))



	treeMgr.go(tree, callback);
}



//mouse over stuff



// the given scope is the scope of a tree inside a recursions
Graph.prototype.updateScope = function ($scope, isMouseOver) {
	if ($scope.isExpanded) {
		$scope.style['box-shadow'] = 'gray 0px 0px 9px'
		$scope.style.zIndex = 999;
	}
	else {
		if (isMouseOver) {
			$scope.style['box-shadow'] = 'gray 0px 0px 6px'
			$scope.style.zIndex = 150;
		}
		else {
			$scope.style['box-shadow'] = 'gray 0px 0px 0px'
			$scope.style.zIndex = $scope.baseZIndex;
		}
	}
};

Graph.prototype.onMouseOver = function ($scope) {
	this.updateScope($scope, true);
}

Graph.prototype.onMouseOut = function ($scope) {
	this.updateScope($scope, false);
};



//expand and shrink



Graph.prototype.calculatePanelWidth = function (tree) {
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


// if a panel in a tree is clicked
Graph.prototype.onClick = function ($scope) {

	var tree = $scope.tree

	//this returns instantly if already loaded
	tree.loadSections(function (err) {

		//setTimeout 0 because $scope.$update()
		setTimeout(function () {
			$scope.isExpanded = !$scope.isExpanded;

			//if it failed, toggle isExpanded and update the scope
			if (err) {
				console.log("ERRor loading loadSections", err)
			}
			//if it worked, calculate the panel width
			else {
				$scope.panelWidth = this.calculatePanelWidth(tree)

				popup.groupSectionTimes(tree.sections)

				if (tree.lastUpdateTime !== undefined) {
					tree.lastUpdateString = moment(tree.lastUpdateTime).fromNow()
				};
			}

			//$scope references just the $scope of the tree that was updated, 
			// this.$scope references everything, and contains $scope

			this.updateScope($scope, false);

			//update the dom with the new $scope and tree
			this.$scope.$apply()

			if ($scope.update) {
				$scope.update()
			}


		}.bind(this), 0)
	}.bind(this))
};

Graph.prototype.openPanel = function ($scope) {
	if ($scope.isExpanded) {
		return;
	}

	this.openOrder.push($scope)

	this.onClick($scope)
};
Graph.prototype.closePanel = function ($scope) {
	if (!$scope.isExpanded) {
		return;
	}

	_.pull(this.openOrder, $scope)

	this.onClick($scope)
};


//called from graph.html
Graph.prototype.onKeyDown = function () {
	var $scope = this.openOrder.shift();
	if (!$scope) {
		return;
	};
	this.closePanel($scope)
};



// called for each recursive call in graphInner.html
//this is called once when $scope.tree === undefined, when the root node first loads
Graph.prototype.initScope = function ($scope) {
	//grab the default z index from the parent $scope, which in intended for this tree
	$scope.baseZIndex = $scope.$parent.baseZIndex

	// z index and shadow both change when expand and on mouse over
	$scope.style = {
		'box-shadow': 'gray 0px 0px 0px',
		zIndex: $scope.baseZIndex
	}
};

Graph.prototype.getCollegeName = function () {
	return selectorsMgr.college.getText();
};


Graph.prototype.Graph = Graph;
module.exports = Graph;
directiveMgr.addDirective(Graph)