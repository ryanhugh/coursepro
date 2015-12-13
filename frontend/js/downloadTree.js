'use strict';
var _ = require('lodash')
var queue = require('queue-async')

var request = require('./request')
var macros = require('./macros')


function DownloadTree () {

	this.host = null;
	this.termId = null;
}

DownloadTree.prototype.convertServerData = function(data) {
	var retVal={};
 

	//given a class, process the prereqs
	//squish the class details and the first row of the prereqs
	if (data.classId!==undefined && data.subject!==undefined) {
		retVal = data;
		retVal.isClass = true;
		retVal.isString = false;
		if (data.name!==undefined || data.prereqs!==undefined || data.url!==undefined) {
			retVal.dataStatus = macros.DATASTATUS_DONE;
		}
		else {
			retVal.dataStatus = macros.DATASTATUS_NOTSTARTED;
		}
		if (data.type!==undefined || data.values!==undefined) {
			console.log('error type or values in data???',data)
		};

		if (data.prereqs) {
			var prereqs = [];
			data.prereqs.values.forEach(function (item){
				prereqs.push(this.convertServerData(item));
			}.bind(this))
			data.prereqs.values = prereqs;
		}
		else {
			data.prereqs = {type:'or',values:[]};
		}
		
		
		if (data.coreqs) {
			var convertedCoreqs = [];
			data.coreqs.values.forEach(function (subTree){
				convertedCoreqs.push(this.convertServerData(subTree));
			}.bind(this));
			data.coreqs.values = convertedCoreqs;
		}
		else {
			data.coreqs = {type:'or',values:[]}
		}
	}

	//given a branch in the prereqs
	else if (data.values && data.type) {
		retVal.isClass = false;

		retVal.prereqs = {type:data.type,values:[]};
		retVal.coreqs = {type:'or',values:[]}

		//HOW DO WE KNOW TO APPEND TO PREREQS?
		data.values.forEach(function (item){
			retVal.prereqs.values.push(this.convertServerData(item));
		}.bind(this))
	}

	//basic string
	else if ((typeof data) == 'string'){
		retVal.dataStatus = macros.DATASTATUS_DONE;
		retVal.isClass = true;
		retVal.isString = true;
		retVal.desc = data;


		retVal.prereqs = {type:'or',values:[]};
		retVal.coreqs = {type:'or',values:[]}
	}

	return retVal;
}

DownloadTree.prototype.fetchFullTreeOnce = function(tree,queue,ignoreClasses) {
	if (ignoreClasses===undefined) {
		ignoreClasses = [];
	}


	
	if (tree.isClass && !tree.isString) {
		
		
		//fire off ajax and add it to queue
		if (tree.dataStatus===macros.DATASTATUS_NOTSTARTED) {

			if (!tree.classId || !tree.subject) {
				console.log('class must have class id and subject')
				return;
			};
			tree.dataStatus = macros.DATASTATUS_LOADING;

			queue.defer(function (callback) {
				request({
					url:'/listClasses',
					type:'POST',
					resultsQuery:{
						classId:tree.classId
					},
					body:{
						subject:tree.subject,
						host:this.host,
						termId:this.termId
					}
				},function (err,body) {
					tree.dataStatus= macros.DATASTATUS_DONE;
					if (err) {
						console.log('http error...',err);
						return callback(err)
					}

					if (body.length==0) {
						console.log('unable to find class even though its a prereq of another class????',tree)
						tree.dataStatus = macros.DATASTATUS_FAIL;
						return callback()
					};

					//setup an or tree
					if (body.length > 1) {
						tree.isClass = false;
						tree.prereqs  = {type:'or',values:[]}

						body.forEach(function (classData) {
							tree.prereqs.values.push(this.convertServerData(classData))
						}.bind(this))

						//load the nodes, skip tree and go right to the bottom edge of the loaded nodes
						//if we just do fetch this tree, it will hit nodes it has already loaded (in the ignoreClasses list)
						 //and stop processing
						tree.prereqs.values.forEach(function(subTree) {
							this.fetchSubTrees(subTree,queue,ignoreClasses)
						}.bind(this));
						
						
					}

					//else just add more data to the class
					else {
						var classData = this.convertServerData(body[0])

						for (var attrName in classData) {
							tree[attrName] = classData[attrName]
						}

						//process this nodes values, already at bottom edge of loaded nodes
						this.fetchSubTrees(tree,queue,ignoreClasses)
					}


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
		this.fetchSubTrees(tree,queue,ignoreClasses)
	}
}

DownloadTree.prototype.setNodesAttrs = function(tree,attrs) {
	
	for (var attrName in attrs) {
		tree[attrName] = attrs[attrName]
	}
	
	
	tree.prereqs.values.forEach(function(subTree) {
		this.setNodesAttrs(subTree);
	}.bind(this))
	
	tree.coreqs.values.forEach(function(subTree){
		this.setNodesAttrs(subTree);
	}.bind(this))
}

//this is called on a subtree when it responds from the server and when recursing down a tree
DownloadTree.prototype.fetchSubTrees = function(tree,queue,ignoreClasses) {

	var toProcess = [];
		
	//mark all the coreqs as coreqs
	tree.coreqs.values.forEach(function (subTree) {
		this.setNodesAttrs(subTree,{isCoreq:true});
	}.bind(this))
	
	toProcess = toProcess.concat(tree.coreqs.values).concat(tree.prereqs.values)


	toProcess.forEach(function (subTree) {
		

		if (!subTree.isClass || subTree.isString) {

			this.fetchFullTreeOnce(subTree,queue,_.cloneDeep(ignoreClasses));
			return;
		}
		
		if (subTree.dataStatus !=macros.DATASTATUS_NOTSTARTED) {
			console.log('how is it already loaded??',subTree);
			return;
		}
		

		//dont load classes that are on ignore list
		var compareObject = {
			classId:subTree.classId,
			subject:subTree.subject,
			isClass:subTree.isClass
		}

		//pass down all processed classes
		//so if the class has itself as a prereq, or a class that is above it,
		//there is no infinate recursion
		//common for coreqs that require each other
		var hasAlreadyLoaded = _.any(ignoreClasses, _.matches(compareObject));


		if (!hasAlreadyLoaded) {
			this.fetchFullTreeOnce(subTree,queue,_.cloneDeep(ignoreClasses).concat(compareObject));
		}
		else {
			if (!tree.isCoreq) {
				console.log('WARNING removing ',tree.classId,'because already loaded it',ignoreClasses,compareObject)

				_.pull(tree.prereqs.values,subTree);
				_.pull(tree.coreqs.values,subTree);
				
			}
		}

	}.bind(this))
};


DownloadTree.prototype.fetchFullTree = function(tree,callback) {

	this.host = tree.host;
	this.termId  = tree.termId;
	this.tree = tree;


	var q = queue()
	this.fetchFullTreeOnce(tree,q);
	q.awaitAll(function () {

		//another tree was began before this one finished
		if (this.tree!=tree) {
			return callback('error different tree started before this one finished')
		}
		else {
			return callback();
		}
	}.bind(this));
}



DownloadTree.prototype.DownloadTree=DownloadTree;
module.exports = new DownloadTree();


