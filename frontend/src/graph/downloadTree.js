'use strict';
var _ = require('lodash')
var queue = require('d3-queue').queue;

var request = require('../request')
var macros = require('../macros')
var Class = require('../Class')


function DownloadTree() {
	this.visited = []
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
		// catch (e) {
		// 	elog(e,tree, ignoreClasses)
		// 	console.log(tree, ignoreClasses);
		// }
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


DownloadTree.prototype.setNodesAttrs = function (tree, attrs) {

	var toVisit = [tree];
	var visited = [];

	var currTree;
	while ((currTree = toVisit.pop())) {
		if (_(visited).includes(currTree)) {
			continue;
		}
		visited.push(currTree)

		for (var attrName in attrs) {
			currTree[attrName] = attrs[attrName]
		}

		toVisit = toVisit.concat(currTree.prereqs.values).concat(currTree.coreqs.values);
	}



	// tree.prereqs.values.forEach(function (subTree) {
	// 	this.setNodesAttrs(subTree);
	// }.bind(this))

	// tree.coreqs.values.forEach(function (subTree) {
	// 	this.setNodesAttrs(subTree);
	// }.bind(this))
}

//this is called on a subtree when it responds from the server and when recursing down a tree
DownloadTree.prototype.fetchSubTrees = function (tree, ignoreClasses, callback) {

	var toProcess = [];
	// var visited = [];

	//mark all the coreqs as coreqs
	// tree.coreqs.values.forEach(function (subTree) {
	// 	this.setNodesAttrs(subTree, { 
	// 		isCoreq: true
	// 	});
	// }.bind(this))

	toProcess = toProcess.concat(tree.coreqs.values).concat(tree.prereqs.values)

	var subTree;

	//make a queue of sub trees to be processed
	var q = queue()

	while ((subTree = toProcess.pop())) {
		//this prevents infinate recursion in both coreq->coreq-> coreq and in more complicated loops
		if (_(this.visited).includes(subTree)) {
			continue;
		}
		this.visited.push(subTree)

		console.log('processing,',subTree );

		if (!subTree.isClass || subTree.isString) {

			q.defer(function (callback) {
				this.fetchFullTreeOnce(subTree, _.cloneDeep(ignoreClasses), callback);
			}.bind(this))
			continue;
		}

		if (subTree.dataStatus != macros.DATASTATUS_NOTSTARTED) {
			if (!subTree.prereqs || !subTree.coreqs) {
				console.log('tree already loaded but dosent have prereqs or coreqs?', tree);
				continue;
			}
			toProcess = toProcess.concat(subTree.prereqs.values).concat(subTree.coreqs.values);
			continue;
		}


		//dont load classes that are on ignore list
		var compareObject = {
			classUid: subTree.classUid,
			subject: subTree.subject,
			isClass: subTree.isClass
		};

		//pass down all processed classes
		//so if the class has itself as a prereq, or a class that is above it,
		//there is no infinate recursion
		//common for coreqs that require each other
		var hasAlreadyLoaded = _.some(ignoreClasses, _.matches(compareObject));
		// var hasAlreadyLoaded = false;

		// for (var i = 0; i < ignoreClasses.length; i++) {
		// 	for (var attrName in compareObject) {
		// 		if (compareObject[attrName] !== ignoreClasses[attrName]) {
		// 			break;
		// 		}
		// 	}
		// }


		if (!hasAlreadyLoaded) {

			q.defer(function (callback) {
				this.fetchFullTreeOnce(subTree, _.cloneDeep(ignoreClasses).concat(compareObject), callback);
			}.bind(this))

		}
		else {
			if (!tree.isCoreq) {
				console.log('WARNING removing ', tree.classUid, 'because already loaded it', ignoreClasses, compareObject)
				_.pull(tree.prereqs.values, subTree);
				_.pull(tree.coreqs.values, subTree);
			}
		}
	}


	q.awaitAll(function (err) {
		callback(err)
	}.bind(this))
};


DownloadTree.prototype.fetchFullTree = function (serverData, callback) {

	var tree = Class.create(serverData);
	if (!tree) {
		console.log(serverData)
		return callback('wtf')
	}
	if (this.tree) {
		elog('already downloading a different tree')
	}

	this.tree = tree;
	this.visited = []

	console.log(tree);
	this.fetchFullTreeOnce(tree, [], function (err) {
		if (err) {
			elog(err)
		}


		//another tree was began before this one finished
		if (this.tree != tree) {
			return callback('error different tree started before this one finished')
		}
		else {
			this.tree = null;
			return callback(null, this.tree);
		}
	}.bind(this));
}



DownloadTree.prototype.DownloadTree = DownloadTree;
module.exports = new DownloadTree();
