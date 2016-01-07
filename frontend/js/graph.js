'use strict';

var downloadTree = require('./downloadTree')
var treeMgr = require('./treeMgr')
var render = require('./render')
var popup = require('./popup')
var help = require('./help')
var Class = require('./Class')

var homepage = require('./homepage')//this needs to go

//thing that calls on download tree, treeMgr, render, popup and help
//manages the page that generates the tree graphs

function Graph() {

}

Graph.prototype.hide = function() {
	render.clearContainer();
};

//search and below call this, search submits the search request
Graph.prototype.beforeLoad = function() {
	
	render.clearContainer()
	render.showSpinner()

	document.body.style.height = '';
	document.body.style.width = '';
};


Graph.prototype.go = function (tree, callback) {

	// this.beforeLoad();

	downloadTree.fetchFullTree(tree, function (err) {
		if (err) {
			return callback(err);
		};

		// if (homepage.isOnHomepage()) {
		// 	return callback('jumped to homepage before loading tree finished');
		// }

		treeMgr.go(tree);
		render.go(tree);
		popup.go(tree);
		help.go(tree);
		callback(null, tree)
	}.bind(this))

};

Graph.prototype.createTreeWithPath = function (host, termId, subject, classId, callback) {
	if (!callback) {
		callback = function () {}
	}

	var tree = Class.create({
		host:host,
		termId:termId,
		subject:subject,
		classId:classId
	})
	
	if (!tree) {
		console.log('ERROR failed to create tree with ',host,termId,subject,classId)
		console.trace()
		return callback('error')
	};

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

	// var tree = new Node();

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

Graph.prototype.Graph = Graph;
module.exports = new Graph();