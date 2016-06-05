'use strict';
var _ = require('lodash')
var queue = require('d3-queue').queue;
var async = require('async')

var request = require('../request')
var macros = require('../macros')
var Class = require('../Class')


function DownloadTree() {
	this.visited = []
	this.counter = 0
}


DownloadTree.prototype.fetchFullTreeOnce = function (tree, ignoreClasses, callback) {
	if (ignoreClasses === undefined) {
		ignoreClasses = [];
	}

	if (!callback) {
		elog('fetch full tree called without a callback??')
		return;
	}

	if (!tree.isClass || tree.isString) {
		console.log(tree, ignoreClasses);
		this.fetchSubTrees(tree, ignoreClasses, callback)
		return;
	}

	//fire off ajax and add it to q
	if (tree.dataStatus === macros.DATASTATUS_LOADING) {
		var msg = 'skipping tree because data status is loading?' + tree.dataStatus
		elog(msg)
		return callback(msg)
	}

	tree.download(function (err) {
		if (err) {
			elog(err)
			return callback(err)
		}
		tree.resetRequisites();

		//process this nodes values, already at bottom edge of loaded nodes
		this.fetchSubTrees(tree, ignoreClasses, function (err) {
			callback(err, tree)
		}.bind(this))

	}.bind(this));
}



//this is called on a subtree when it responds from the server and when recursing down a tree
DownloadTree.prototype.increaseTreeDepth = function (tree, callback) {
	// if (_(ignoreClasses).includes(tree)) {
	// 	return callback()
	// }

	var toProcess = [tree];

	// unlike before, we NEVER need to visit the same class twice
	var visited = [];

	var treeIsDone = true;


	var subTree;

	//make a queue of sub trees to be processed
	var q = queue()

	this.counter++;
	if (this.counter > 500 || toProcess.length > 500) {
		debugger
	}

	while ((subTree = toProcess.pop())) {

		//this prevents infinate recursion in both coreq->coreq-> coreq and in more complicated loops
		if (_(visited).includes(subTree)) {
			console.log("unsure if this is too agreesive, eg need to load the same class down diff branches?");
			continue;
		}
		visited.push(subTree)

		// if needs to be loaded load it if not do theloine belo

		if (!subTree.isClass || subTree.isString) {
			toProcess = toProcess.concat(subTree.coreqs.values).concat(subTree.prereqs.values)


			// q.defer(function (callback) {
			// 	this.fetchFullTreeOnce(subTree, ignoreClasses.slice(0).concat(subTree), callback);
			// }.bind(this))
			continue;
		}
		else if (subTree.dataStatus === macros.DATASTATUS_NOTSTARTED) {
			if (!subTree.prereqs || !subTree.coreqs) {
				console.log('subTree already loaded but dosent have prereqs or coreqs?', subTree);
				continue;
			}
			treeIsDone = false;
			q.defer(function (callback) {
				subTree.download(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this))
		}
		else if (subTree.dataStatus == macros.DATASTATUS_DONE || subTree.dataStatus === macros.DATASTATUS_FAIL) {

			toProcess = toProcess.concat(subTree.coreqs.values).concat(subTree.prereqs.values)
			continue;
		}
		else {
			elog('wtf')
		}


		// console.log('processing,',subTree );


		// if (subTree.dataStatus != macros.DATASTATUS_NOTSTARTED) {

		// 	toProcess = toProcess.concat(subTree.prereqs.values).concat(subTree.coreqs.values);
		// 	continue;
		// }

		// //pass down all processed classes
		// //so if the class has itself as a prereq, or a class that is above it,
		// //there is no infinate recursion
		// //common for coreqs that require each other
		// var hasAlreadyLoaded = _(ignoreClasses).includes(subTree);

		// if (!hasAlreadyLoaded) {

		// 	q.defer(function (callback) {
		// 		this.fetchFullTreeOnce(subTree, ignoreClasses.slice(0).concat(subTree), callback);
		// 	}.bind(this))

		// }
		// else {
		// 	if (!tree.isCoreq) {
		// 		console.log('WARNING removing ', tree.classUid, 'because already loaded it', ignoreClasses)
		// 		_.pull(tree.prereqs.values, subTree);
		// 		_.pull(tree.coreqs.values, subTree);
		// 	}
		// }
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
	this.visited = []
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
