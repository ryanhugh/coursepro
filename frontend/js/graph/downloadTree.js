'use strict';
var _ = require('lodash')
var queue = require('d3-queue').queue;
var async = require('async')

var request = require('../request')
var macros = require('../macros')
var Class = require('../data/Class')


function DownloadTree() {
	this.counter = 0
}


//this is called on a subtree when it responds from the server and when recursing down a tree
DownloadTree.prototype.increaseTreeDepth = function (tree, callback) {

	var toProcess = [tree];

	// unlike before, we NEVER need to visit the same class twice
	var visited = [];
	var treeIsDone = true;
	var subTree;

	//make a queue of sub trees to be processed
	var q = queue()

	this.counter++;
	// just a check to make sure nothing ridiculous is going on
	if (this.counter > 500 || toProcess.length > 500) {
		elog('counter', this.counter, 'to process:', toProcess.length, tree, toProcess.slice(0, 10));
		return callback(null, tree)
	}

	while ((subTree = toProcess.pop())) {

		//this prevents infinate recursion in both coreq->coreq-> coreq and in more complicated loops
		if (_(visited).includes(subTree)) {
			continue;
		}
		visited.push(subTree)

		if (subTree.isString) {
			toProcess = toProcess.concat(subTree.coreqs.values).concat(subTree.prereqs.values)
			continue;
		}
		else if (subTree.dataStatus === macros.DATASTATUS_NOTSTARTED || subTree.dataStatus === macros.DATASTATUS_LOADING) {
			treeIsDone = false;

			// subTree is asigned to above, so need to keep another reference to this one for the async operation
			
			var currTree = subTree;
			q.defer(function (callback) {
				currTree.download(function (err, currTree) {
					callback(err)
				}.bind(this))
			}.bind(this))
		}
		else if (subTree.dataStatus == macros.DATASTATUS_DONE || subTree.dataStatus === macros.DATASTATUS_FAIL) {

			toProcess = toProcess.concat(subTree.coreqs.values).concat(subTree.prereqs.values)
			continue;
		}
		else {
			elog('wtf', subTree)
		}
	}


	q.awaitAll(function (err) {
		callback(err, treeIsDone)
	}.bind(this))
};


DownloadTree.prototype.fetchFullTree = function (serverData, callback) {

	var tree = Class.create(serverData);
	if (!tree) {
		console.log(serverData)
		return callback('wtf')
	}
	if (this.tree) {
		elog('already downloading a different tree', serverData)
	}

	this.tree = tree;
	this.counter = 0
	var treeIsDone = false;


	async.whilst(
		function () {
			return !treeIsDone;
		}.bind(this),
		function (callback) {
			this.increaseTreeDepth(tree, function (err, isDone) {
				treeIsDone = isDone;
				callback(err)
			}.bind(this))
		}.bind(this),
		function (err, n) {

			//another tree was began before this one finished
			if (this.tree != tree) {
				return callback('error different tree started before this one finished')
			}
			else {
				this.tree = null;
				return callback(null, tree);
			}
		}.bind(this)
	);
}



DownloadTree.prototype.DownloadTree = DownloadTree;
module.exports = new DownloadTree();
