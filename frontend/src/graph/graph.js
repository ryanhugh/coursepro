'use strict';
var _ = require('lodash')
var macros = require('../macros')

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
	this.classCount = null;

	//controls the state of the spinner
	this.isLoading = false;


	var path = {};

	for (var attrName in this.$routeParams) {
		path[attrName] = decodeURIComponent(this.$routeParams[attrName])
	}

	//if given path, load graph
	if (path.classId && path.subject) {
		if (_(this.$location.path()).startsWith('/search')) {
			this.search(path)
		}
		else if (_(this.$location.path()).startsWith('/graph')) {
			this.createGraph(path)
		}

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

Graph.prototype.go = function (tree, callback) {
	this.isLoading = true;
	downloadTree.fetchFullTree(tree, function (err, tree) {
		setTimeout(function () {
			this.isLoading = false;
			if (err) {
				return callback(err);
			};



			treeMgr.go(tree);


			this.classCount = treeMgr.countClassesInTree(tree);



			// render.go(tree);
			// popup.go(tree);
			// help.go(tree);
			// this.tree = tree;
			//SOMEWHERE ENsure that all class have prettyurl, and if not copy over url

			this.$scope.tree = tree;
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
