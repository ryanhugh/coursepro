'use strict';
var _ = require('lodash')
var queue = require('d3-queue').queue;

var request = require('../request')
var macros = require('../macros')
var Class = require('../Class')


function DownloadTree() {

}


DownloadTree.prototype.fetchFullTreeOnce = function (tree, ignoreClasses, callback) {
	if (ignoreClasses === undefined) {
		ignoreClasses = [];
	}

	if (!tree.isClass || tree.isString) {
		this.fetchSubTrees(tree, ignoreClasses, callback)
		return;
	}

	//fire off ajax and add it to q
	if (tree.dataStatus !== macros.DATASTATUS_NOTSTARTED) {
		console.log('skipping tree because data status is already started?')
		return;
	}

	//q.defer(function (callback) {

	tree.download(function (err) {
		if (err) {
			console.log(err)
			return callback(err)
		}

		//process this nodes values, already at bottom edge of loaded nodes
		this.fetchSubTrees(tree, ignoreClasses, function(err) {
			callback(err, tree)
		}.bind(this))

	//	}.bind(this))
	}.bind(this));
}


DownloadTree.prototype.setNodesAttrs = function (tree, attrs) {

	for (var attrName in attrs) {
		tree[attrName] = attrs[attrName]
	}


	tree.prereqs.values.forEach(function (subTree) {
		this.setNodesAttrs(subTree);
	}.bind(this))

	tree.coreqs.values.forEach(function (subTree) {
		this.setNodesAttrs(subTree);
	}.bind(this))
}

//this is called on a subtree when it responds from the server and when recursing down a tree
DownloadTree.prototype.fetchSubTrees = function (tree, ignoreClasses, callback) {

	var toProcess = [];

	//mark all the coreqs as coreqs
	tree.coreqs.values.forEach(function (subTree) {
		this.setNodesAttrs(subTree, {
			isCoreq: true
		});
	}.bind(this))

	toProcess = toProcess.concat(tree.coreqs.values).concat(tree.prereqs.values)

	var subTree;
	
	//make a queue of sub trees to be processed
	var q = queue()

	while ((subTree = toProcess.pop())) {


		if (!subTree.isClass || subTree.isString) {

			q.defer(function(callback){
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
			classId: subTree.classId,
			subject: subTree.subject,
			isClass: subTree.isClass
		};

		//pass down all processed classes
		//so if the class has itself as a prereq, or a class that is above it,
		//there is no infinate recursion
		//common for coreqs that require each other
		var hasAlreadyLoaded = _.some(ignoreClasses, _.matches(compareObject));


		if (!hasAlreadyLoaded) {
			
			q.defer(function(callback){
				this.fetchFullTreeOnce(subTree, _.cloneDeep(ignoreClasses).concat(compareObject),callback);
			}.bind(this))
			
		}
		else {
			if (!tree.isCoreq) {
				console.log('WARNING removing ', tree.classId, 'because already loaded it', ignoreClasses, compareObject)
				_.pull(tree.prereqs.values, subTree);
				_.pull(tree.coreqs.values, subTree);
			}
		}
	}
	
	
	q.awaitAll(function(err){
		callback(err)
	}.bind(this))
};


DownloadTree.prototype.fetchFullTree = function (serverData, callback) {

	var tree = Class.create(serverData);
	if (!tree) {
		console.log(serverData)
		return callback('wtf')
	}

	this.tree = tree;


	var q = queue()
	this.fetchFullTreeOnce(tree, q);
	q.awaitAll(function () {

		//another tree was began before this one finished
		if (this.tree != tree) {
			return callback('error different tree started before this one finished')
		}
		else {
			return callback(null, this.tree);
		}
	}.bind(this));
}



DownloadTree.prototype.DownloadTree = DownloadTree;
module.exports = new DownloadTree();