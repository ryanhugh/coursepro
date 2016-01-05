'use strict';
var _ = require('lodash')
var queue = require('queue-async')

var request = require('./request')
var macros = require('./macros')
var Class = require('./Class')


function DownloadTree() {

	this.host = null;
	this.termId = null;
}

DownloadTree.prototype.convertServerData = function(data) {
	var retVal = {};

	if (data instanceof Class) {

	}

	//given a class, process the prereqs
	//squish the class details and the first row of the prereqs
	if (data.classId !== undefined && data.subject !== undefined) {
		retVal = data;
		retVal.isClass = true;
		retVal.isString = false;
		if (data.name !== undefined || data.prereqs !== undefined || data.url !== undefined) {
			retVal.dataStatus = macros.DATASTATUS_DONE;
		}
		else {
			retVal.dataStatus = macros.DATASTATUS_NOTSTARTED;
		}
		if (data.type !== undefined || data.values !== undefined) {
			console.log('error type or values in data???', data)
		};

		if (data.prereqs) {
			var prereqs = [];
			data.prereqs.values.forEach(function(item) {
				prereqs.push(this.convertServerData(item));
			}.bind(this))
			data.prereqs.values = prereqs;
		}
		else {
			data.prereqs = {
				type: 'or',
				values: []
			};
		}


		if (data.coreqs) {
			var convertedCoreqs = [];
			data.coreqs.values.forEach(function(subTree) {
				convertedCoreqs.push(this.convertServerData(subTree));
			}.bind(this));
			data.coreqs.values = convertedCoreqs;
		}
		else {
			data.coreqs = {
				type: 'or',
				values: []
			}
		}
	}

	//given a branch in the prereqs
	else if (data.values && data.type) {
		retVal.isClass = false;

		retVal.prereqs = {
			type: data.type,
			values: []
		};
		retVal.coreqs = {
			type: 'or',
			values: []
		}

		//HOW DO WE KNOW TO APPEND TO PREREQS?
		data.values.forEach(function(item) {
			retVal.prereqs.values.push(this.convertServerData(item));
		}.bind(this))
	}

	//basic string
	else if ((typeof data) == 'string') {
		retVal.dataStatus = macros.DATASTATUS_DONE;
		retVal.isClass = true;
		retVal.isString = true;
		retVal.desc = data;


		retVal.prereqs = {
			type: 'or',
			values: []
		};
		retVal.coreqs = {
			type: 'or',
			values: []
		}
	}

	//already processed node
	else if (data.prereqs && data.coreqs) {
		retVal = data;

		var newCoreqs = [];
		data.coreqs.values.forEach(function(subTree) {
			newCoreqs.push(this.convertServerData(subTree))
		}.bind(this))

		data.coreqs.values = newCoreqs



		var newPrereqs = [];
		data.prereqs.values.forEach(function(subTree) {
			newPrereqs.push(this.convertServerData(subTree))
		}.bind(this))

		data.prereqs.values = newPrereqs;
	}

	return retVal;
}

DownloadTree.prototype.fetchFullTreeOnce = function(tree, queue, ignoreClasses) {
	if (ignoreClasses === undefined) {
		ignoreClasses = [];
	}



	if (tree.isClass && !tree.isString) {


		//fire off ajax and add it to queue
		if (tree.dataStatus === macros.DATASTATUS_NOTSTARTED) {

			if (!tree.classId || !tree.subject) {
				console.log('class must have class id and subject')
				return;
			};



			queue.defer(function(callback) {
					
						tree.download(function (err,tree) {
							if (err) {
								console.log(err)
								return callback(err)
							}
							callback(null,tree)
						}.bind(this))

						callback();
					}.bind(this));
					//
				}.bind(this))
				// 
		}
		else {
			console.log('skipping tree because data status is already started?')
		}
	}
	else {
		this.fetchSubTrees(tree, queue, ignoreClasses)
	}
}

DownloadTree.prototype.setNodesAttrs = function(tree, attrs) {

	for (var attrName in attrs) {
		tree[attrName] = attrs[attrName]
	}


	tree.prereqs.values.forEach(function(subTree) {
		this.setNodesAttrs(subTree);
	}.bind(this))

	tree.coreqs.values.forEach(function(subTree) {
		this.setNodesAttrs(subTree);
	}.bind(this))
}

//this is called on a subtree when it responds from the server and when recursing down a tree
DownloadTree.prototype.fetchSubTrees = function(tree, queue, ignoreClasses) {

	var toProcess = [];

	//mark all the coreqs as coreqs
	tree.coreqs.values.forEach(function(subTree) {
		this.setNodesAttrs(subTree, {
			isCoreq: true
		});
	}.bind(this))

	toProcess = toProcess.concat(tree.coreqs.values).concat(tree.prereqs.values)

	var subTree;

	while (subTree = toProcess.pop()) {


		if (!subTree.isClass || subTree.isString) {

			this.fetchFullTreeOnce(subTree, queue, _.cloneDeep(ignoreClasses));
			continue;
		}

		if (subTree.dataStatus != macros.DATASTATUS_NOTSTARTED) {
			if (!subTree.prereqs || !subTree.coreqs) {
				console.log('tree already loaded but dosent have prereqs or coreqs?', tree)
				continue
			}
			toProcess = toProcess.concat(subTree.prereqs.values).concat(subTree.coreqs.values)
			continue;
		}


		//dont load classes that are on ignore list
		var compareObject = {
			classId: subTree.classId,
			subject: subTree.subject,
			isClass: subTree.isClass
		}

		//pass down all processed classes
		//so if the class has itself as a prereq, or a class that is above it,
		//there is no infinate recursion
		//common for coreqs that require each other
		var hasAlreadyLoaded = _.any(ignoreClasses, _.matches(compareObject));


		if (!hasAlreadyLoaded) {
			this.fetchFullTreeOnce(subTree, queue, _.cloneDeep(ignoreClasses).concat(compareObject));
		}
		else {
			if (!tree.isCoreq) {
				console.log('WARNING removing ', tree.classId, 'because already loaded it', ignoreClasses, compareObject)
				_.pull(tree.prereqs.values, subTree);
				_.pull(tree.coreqs.values, subTree);
			}
		}
	}
};


DownloadTree.prototype.fetchFullTree = function(tree, callback) {

	this.host = tree.host;
	this.termId = tree.termId;
	this.tree = tree;


	var q = queue()
	this.fetchFullTreeOnce(tree, q);
	q.awaitAll(function() {

		//another tree was began before this one finished
		if (this.tree != tree) {
			return callback('error different tree started before this one finished')
		}
		else {
			return callback(null,this.tree);
		}
	}.bind(this));
}



DownloadTree.prototype.DownloadTree = DownloadTree;
module.exports = new DownloadTree();