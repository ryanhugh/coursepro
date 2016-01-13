'use strict';
var moment = require('moment')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var downloadTree = require('./downloadTree')
var treeMgr = require('./treeMgr')

var help = require('./help')
var Class = require('../Class')
var macros = require('../macros')


//thing that calls on download tree, treeMgr, render, popup and help
//manages the page that generates the tree graphs

function Graph($scope, $routeParams, $document, $route, $location) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.graph = this;

	//need to get the macros to the html somehow...
	this.macros = macros;

	if (_($location.path()).startsWith('/search')) {
		this.showClasses()
	}
	else if (_($location.path()).startsWith('/graph')) {
		this.createGraph($routeParams)
	}
}

Graph.isPage = true;
Graph.urls = ['/graph/:host/:termId/:subject/:classId','/search/:host/:termId/:subject:/:searchTerm']

 

Graph.prototype.go = function (tree, callback) {
	downloadTree.fetchFullTree(tree, function (err, tree) {
		setTimeout(function () {
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