'use strict';
var moment = require('moment')
var macros = require('../macros')
var request = require('../request')

// base angular stuff
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

//tree stuff
var downloadTree = require('./downloadTree')
var treeMgr = require('./treeMgr')
var help = require('./help')

//model
var Class = require('../Class')

var WatchClassesModel = require('../WatchClassesModel')

//thing that calls on download tree, treeMgr, render, popup and help
//manages the page that generates the tree graphs

function Graph($scope, $routeParams, $location, $uibModal) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.graph = this;
	this.$routeParams = $routeParams;
	this.$uibModal = $uibModal

	//need to get the macros to the html somehow...
	this.macros = macros;

	if (_($location.path()).startsWith('/search')) {
		this.search($routeParams)
	}
	else if (_($location.path()).startsWith('/graph')) {
		this.createGraph($routeParams)
	}
}

Graph.isPage = true;
Graph.urls = ['/graph/:host/:termId/:subject/:classId', '/search/:host/:termId/:subject/:searchTerm']



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


//search


Graph.prototype.search = function ($routeParams) {
	var value = $routeParams.searchTerm.trim()
	if (value === '') {
		return;
	};

	var value = value.replace(/\s+/g, '').toLowerCase()


	//if found a class, open the class tree with the selectorsMgr and dont search for anything
	// if (selectorsMgr.searchClasses(value)) {
	// 	this.closeSearchBox();
	// 	return;
	// };


	ga('send', {
		'hitType': 'pageview',
		'page': window.location.href,
		'title': 'Coursepro.io'
	});

	console.log('searching for ', value)

	// graph.beforeLoad()

	request({
		url: '/search',
		type: 'POST',
		body: {
			host: $routeParams.host,
			termId: $routeParams.termId,
			subject: $routeParams.subject,
			value: value
		}
	}, function (err, results) {
		console.log('found ', results.length, ' classes!');


		//update the deeplink here
		if (results.length > 0) {
			this.showClasses(results, function (err, tree) {
				if (err) {
					console.log('ERROR rendering tree...?', err, tree);
					return;
				}

				treeMgr.logTree(tree, {
					type: 'search',
					host: host,
					termId: termId,
					subject: subject,
					searchQuery: value
				})
			});
		}
		else {
			this.container.innerHTML = '<div style="font-size: 28px;text-align: center;padding-top: 200px;font-weight: 600;">Nothing Found!</div>'

			treeMgr.logTree({}, {
				type: 'search',
				host: $routeParams.host,
				termId: $routeParams.termId,
				subject: $routeParams.subject,
				searchQuery: value

			})
		}

	}.bind(this))
};



Graph.prototype.showClasses = function (classList) {
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

	this.go(treeParams, function () {

	}.bind(this))
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



Graph.prototype.openWatchModel = function ($scope) {
	this.$uibModal.open(WatchClassesModel.getOpenDetails($scope.tree))
};


Graph.prototype.Graph = Graph;
module.exports = Graph;
directiveMgr.addDirective(Graph) 