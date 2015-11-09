'use strict';

function TreeMgr () {
	this.DATASTATUS_NOTSTARTED = 0;
	this.DATASTATUS_LOADING = 1;
	this.DATASTATUS_DONE = 2;
	this.DATASTATUS_FAIL = 3;


	this.host = null;
	this.termId = null;
}

TreeMgr.prototype.convertServerData = function(data) {
	var retVal={};


	//given a class, process the prereqs
	//squish the class details and the first row of the prereqs
	if (data.classId!==undefined && data.subject!==undefined) {
		retVal = data;
		retVal.isClass = true;
		retVal.isString = false;
		if (data.name!==undefined || data.prereqs!==undefined || data.url!==undefined) {
			retVal.dataStatus = this.DATASTATUS_DONE;
		}
		else {
			retVal.dataStatus = this.DATASTATUS_NOTSTARTED;
		}
		if (data.type!==undefined || data.values!==undefined) {
			console.log('error type or values in data???',data)
		};

		if (data.prereqs) {
			retVal.values = [];
			retVal.type = data.prereqs.type;
			data.prereqs.values.forEach(function (item){
				retVal.values.push(this.convertServerData(item));
			}.bind(this))
		}
		else {
			retVal.type = "and";
			retVal.values = [];
		}
		
		
		if (data.coreqs) {
			var convertedCoreqs = [];
			data.coreqs.values.forEach(function (subTree){
				convertedCoreqs.push(this.convertServerData(subTree));
			}.bind(this));
			data.coreqs.values = convertedCoreqs;
		}
	}

	//given a branch in the prereqs
	else if (data.values && data.type) {
		retVal.isClass = false;
		retVal.type=data.type
		retVal.values = []
		data.values.forEach(function (item){
			retVal.values.push(this.convertServerData(item));
		}.bind(this))
	}

	//basic string
	else if ((typeof data) == 'string'){
		retVal.dataStatus = this.DATASTATUS_DONE;
		retVal.isClass = true;
		retVal.isString = true;
		retVal.desc = data;
	}

	return retVal;
}

TreeMgr.prototype.fetchFullTreeOnce = function(tree,queue,ignoreClasses) {
	if (ignoreClasses===undefined) {
		ignoreClasses = [];
	}


	
	if (tree.isClass) {
		
	  	//dont load classes that are on ignore list
	  	var compareObject = {
	  		classId:tree.classId,
	  		subject:tree.subject
	  	}
	  	
		//pass down all processed classes
		//so if the class has itself as a prereq, or a class that is above it,
		//there is no infinate recursion
		//common for coreqs that require each other
		var hasAlreadyLoaded = _.any(ignoreClasses, _.matches(compareObject))

		ignoreClasses.push(compareObject)
		
		//fire off ajax and add it to queue
		if (!hasAlreadyLoaded && tree.dataStatus===this.DATASTATUS_NOTSTARTED) {

			if (!tree.classId || !tree.subject) {
				console.log('class must have class id and subject')
				return;
			};
			tree.dataStatus = this.DATASTATUS_LOADING;

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
					tree.dataStatus= this.DATASTATUS_DONE;
					if (err) {
						console.log('http error...',err);
						return callback(err)
					}

					if (body.length==0) {
						console.log('unable to find class even though its a prereq of another class????',tree)
						tree.dataStatus = this.DATASTATUS_FAIL;
						return callback()
					};

					//setup an or tree
					if (body.length > 1) {
						tree.type = 'or';
						tree.isClass = false;
						tree.values = [];

						body.forEach(function (classData) {
							tree.values.push(this.convertServerData(classData))
						}.bind(this))
					}

					//else just add more data to the class
					else {
						var classData = this.convertServerData(body[0])

						for (var attrName in classData) {
							tree[attrName] = classData[attrName]
						}
					}

					this.fetchSubTrees(tree,queue,ignoreClasses)

					callback();
				}.bind(this));
				//
			}.bind(this))
			//
		}
	}//



	this.fetchSubTrees(tree,queue,ignoreClasses)

}

//this is called on a subtree when it responds from the server and when recursing down a tree
TreeMgr.prototype.fetchSubTrees = function(tree,queue,ignoreClasses) {
	
	//load coreqs
	if (tree.coreqs) {
		tree.coreqs.values.forEach(function(subTree) {
			this.fetchFullTreeOnce(subTree,queue,_.cloneDeep(ignoreClasses));
		}.bind(this));
	}
	

	//fetch its values too
	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.fetchFullTreeOnce(subTree,queue,_.cloneDeep(ignoreClasses))
		}.bind(this))
	}
};




TreeMgr.prototype.fetchFullTree = function(tree,callback) {
	var q = queue()
	this.fetchFullTreeOnce(tree,q);
	q.awaitAll(callback);
}



TreeMgr.prototype.simplifyTree = function(tree) {
	if (!tree.values) {
		return;
	}

	//remove duplicates
	var newTreeValues = [];
	tree.values.forEach(function (subTree) {
		if (!_.any(newTreeValues, _.matches(subTree))) {
			newTreeValues.push(subTree)
		}
	}.bind(this))
	tree.values = newTreeValues;


	//if values is only 1 long to a circle, delete circle and bring lines straight to parent
	//if values is only 1 long from panel to circle, same as above
	if (tree.values.length==1) {
		if (!tree.values[0].isClass) {
			tree.type = tree.values[0].type;
			tree.values = tree.values[0].values;
		}
		
		if (!tree.isClass) {
			
			//if node -> panel, copy panel attrs to node
			var subTree = tree.values[0];
			for (var attrName in subTree) {
				tree[attrName] = subTree[attrName]
			}
		}
		
	};
	
	
	


	//if type of dep is the same, merge cs 2800
	newTreeValues = [];
	tree.values.forEach(function (subTree) {
		
		if (!subTree.isClass && subTree.type==tree.type) {
			newTreeValues = newTreeValues.concat(subTree.values);
		}
		else {
			newTreeValues.push(subTree)
		}

	}.bind(this))
	tree.values = newTreeValues


	//just changes the single red lines to blue
	//if there is only 1 option it dosent matter if its "or" or "and"
	if (tree.values.length===1) {
		tree.type='or'
	}

	//recursion
	tree.values.forEach(function (subTree) {
		this.simplifyTree(subTree);
	}.bind(this))
}


TreeMgr.prototype.sortTree = function(tree) {
	if (!tree.values) {
		return;
	}


	var sizes = [];
	var subTrees = [];

	//subTrees with no values are sorted by classId
	var subPanels = [];

	tree.values.forEach(function (subTree) {
		if (!subTree.values || subTree.values.length===0) {
			subPanels.push(subTree);
		}
		else {
			subTrees.push(subTree)
			sizes.push({
				tree:subTree,
				size:this.countClassesInTree(subTree)
			})
		}
	}.bind(this))


	//sort the panels by classId
	subPanels.sort(function (a,b) {
		if (a.isString && b.isString) {
			return 0;
		}

		if (a.isString) {
			return -1;
		}
		if (b.isString) {
			return 1;
		};

		var aId = parseInt(a.classId);
		var bId = parseInt(b.classId);

		if (aId>bId) {
			return 1;
		}
		else if (aId<bId) {
			return -1;
		}
		
		//if ids are the same, sort by subject
		else if (a.subject>b.subject) {
			return 1;
		}
		else if (a.subject<b.subject) {
			return -1;
		}
		
		//this is possible if there are (hon) and non hon classes of same subject classId
		return 0

	}.bind(this))


	//sort the trees so the largest ones are on the outside
	subTrees.sort(function (a,b) {
		var asize;
		var bsize;

		sizes.forEach(function (item) {
			if (item.tree===a) {
				asize=item.size;
			}
			if (item.tree === b) {
				bsize = item.size;
			}
		})
		return asize>bsize;
	}.bind(this))

	var odds=[];
	var evens=[];

	subTrees.forEach(function (subTree,index) {
		if (index%2===0) {
			evens.push(subTree);
		}
		else {
			odds.push(subTree);
		}
	}.bind(this))

	evens.reverse();

	tree.values = evens.concat(subPanels.concat(odds))

	tree.values.forEach(function (subTree) {
		this.sortTree(subTree);
	}.bind(this))
}


//counts all classes, coreqs and prereqs
TreeMgr.prototype.countClassesInTree = function(tree) {
	
	var retVal;
	
	if (tree.isClass) {
		retVal=1;
	}
	else {
		retVal =0;
	}

	
	if (tree.values) {
		tree.values.forEach(function(subTree) {
			retVal+=this.countClassesInTree(subTree);
		}.bind(this))
	}
	
	if (tree.coreqs) {
		tree.coreqs.values.forEach(function(subTree){
			retVal+=this.countClassesInTree(subTree);
		}.bind(this))
	}
	
	return retVal;
}




TreeMgr.prototype.addAllParentRelations = function(tree,parent) {
	if (!tree.allParents) {
		tree.allParents = [];
	}

	if (parent && tree.allParents.indexOf(parent)<0) {
		tree.allParents.push(parent)
		if (tree.allParents.length>1) {
			console.log('added a second parent on ',tree.subject,tree.classId)
		};
	}
	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addAllParentRelations(subTree,tree);
		}.bind(this))
	};

	if (tree.coreqs) {
		tree.coreqs.values.forEach(function (subTree) {
			this.addAllParentRelations(subTree,tree);
		}.bind(this))
	};
}


TreeMgr.prototype.addLowestParent = function(tree) {
	if (tree.allParents.length===0) {
		tree.lowestParent = null;
	}
	else {

		tree.lowestParent = tree.allParents[0];
		for (var i = 0; i < tree.allParents.length; i++) {
			if (tree.allParents[i].depth>tree.lowestParent) {
				tree.lowestParent = tree.allParents[i];
			}
		}
	}


	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addLowestParent(subTree);
		}.bind(this))
	};

	if (tree.coreqs) {
		tree.coreqs.values.forEach(function (subTree) {
			this.addLowestParent(subTree);
		}.bind(this))
	};
}


//currenly used to flatten coreq trees (which are usally flat anyway)
TreeMgr.prototype.getFirstLayer = function(tree) {
	if (!tree.values) {
		return [];
	};


	if (tree.isClass) {
		return tree.values;
	}
	else {
		var values = [];
		tree.values.forEach(function (subTree) {
			values=values.concat(this.getFirstLayer(subTree));

		}.bind(this));
		return values;
	}
};



TreeMgr.prototype.addDepthLevel = function(tree,depth) {
	if (depth===undefined) {
		depth=0
	}
	tree.depth = depth;

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addDepthLevel(subTree,depth+1);
		}.bind(this))
	};
}

// only recurses on nodes and not classes - finds a list of classes
TreeMgr.prototype.findFlattendClassList = function(tree) {
	var retVal = [];
	if (tree.isClass) {
		retVal.push(tree);
	}

	if (tree.values && !tree.isClass) {
		tree.values.forEach(function (subTree) {
			retVal=retVal.concat(this.findFlattendClassList(subTree));
		}.bind(this))
	};
	return retVal;
}


TreeMgr.prototype.flattenCoreqs = function(tree) {

	if (tree.coreqs) {
		var flatCoreqs = [];

		tree.coreqs.values.forEach(function (subTree) {
			flatCoreqs=flatCoreqs.concat(this.findFlattendClassList(subTree));
		}.bind(this));

		flatCoreqs.forEach(function (subTree,index) {
			subTree.coreqIndex = index;
			subTree.isCoreq = true;

			//delete the coreq's prereq's, for now
			subTree.values = undefined;
		}.bind(this))

		tree.coreqs.values = flatCoreqs;
	}


	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.flattenCoreqs(subTree)
		}.bind(this));
	};
};


TreeMgr.prototype.removeCoreqsCoreqs = function(tree,isACoreq) {

	//if this class is a coreq to another class, remove its coreqs
	if (isACoreq) {
		tree.coreqs = undefined;
	}


	if (tree.coreqs) {
		tree.coreqs.values.forEach(function (subTree) {
			this.removeCoreqsCoreqs(subTree,true);
		}.bind(this))
	}

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.removeCoreqsCoreqs(subTree);
		}.bind(this));
	};
};


//remove (hon) labs on non hon classes, and remove non (hon) labs on non hon classes
//the proper way to do this is scrape the honors attribute from banner, and group by that, but for now just match title
TreeMgr.prototype.groupByHonors = function(tree) {


	if (tree.isClass && tree.coreqs) {

		if (!_(tree.host).startsWith('neu.edu')) {
			return;
		};

		var thisClassIsHon = _(tree.name).includes('(hon)')

		var filteredCoreqs = [];
		tree.coreqs.values.forEach(function (subTree) {
			if (_(subTree.name).includes('(hon)') && thisClassIsHon) {
				filteredCoreqs.push(subTree);
			}
			else if (!_(subTree.name).includes('(hon)') && !thisClassIsHon) {
				filteredCoreqs.push(subTree);
			}
		}.bind(this));

		//update the coreq index
		filteredCoreqs.forEach(function (subTree,index) {
			subTree.coreqIndex = index;
		}.bind(this))

		tree.coreqs.values=filteredCoreqs;
	}



	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.groupByHonors(subTree);
		}.bind(this));
	};
};


TreeMgr.prototype.logTree = function(tree,body){
	
	//tell the server how big this tree is
	var classCount = this.countClassesInTree(tree);
	
	if (!body.type) {
		console.log('ERROR not given a tree type',body);
		console.trace();
	}
	
	body.classCount = classCount;
	
	//copy data from the tree
	if (tree.isClass) {
		body.classId = tree.classId;
		body.subject = tree.subject;
		body.termId = tree.termId;
		body.host = tree.host;
	}
	else {
		if (tree.termId!==undefined) {
			body.termId = tree.termId;
		}
		if (tree.host!==undefined){
			body.host = tree.host;
		}
	}
	
	
	console.log('The tree is ',classCount,' big');
	request({
		url:'/log',
		body:body,
		useCache:false
	},function(err,response){
		if (err) {
			console.log("ERROR: couldn't log tree size :(",err,response,body);
		}
	}.bind(this))
	
	
}


TreeMgr.prototype.createTree = function(host,termId,subject,classId) {
	
	var tree = {
		host:host,
		termId:termId,
		subject:subject,
		classId:classId,
		isClass:true,
		dataStatus:this.DATASTATUS_NOTSTARTED
	}

	//process tree takes in a callback
	this.processTree(tree,function(err,tree){
		if (err) {
			console.log('error processing tree',err,tree);
			return;
		}
		
		this.logTree(tree,{
			type:'createTree'
		})
	}.bind(this));
	

}
TreeMgr.prototype.showClasses = function(classList,callback) {
	if (classList.length<1) {
		console.log('error show classes was called with 0 classes!')
		return;
	};

	
	var tree = {};

	tree.isClass = false;
	tree.type='or'
	tree.values = classList
	tree.host = classList[0].host
	tree.termId = classList[0].termId
	
	//hide the node for search
	tree.hidden = true;
	

	this.convertServerData(tree);

	//this is ghetto
	//remove the prereqs of the class given so they dont have trees coming down from them
	tree.values.forEach(function (subTree) {
		subTree.values = []
	}.bind(this))


	
	this.processTree(tree,callback);
}



TreeMgr.prototype.processTree = function(tree,callback) {
	this.host = tree.host;
	this.termId  = tree.termId;
	this.tree = tree;

	if (!callback) {
		callback=function(){};
	};

	render.clearContainer()
	render.showSpinner()
	document.body.style.height = '';
	this.fetchFullTree(tree,function () {
		
		
		//another tree was began before this one finished
		if (this.tree!=tree) {
			return;
		}

		// this.matchCoreqsByHonors(tree);
		this.flattenCoreqs(tree);
		this.removeCoreqsCoreqs(tree);
		
		//at this point, there should not be any with data status = not started, so if find any remove them
		//actually, dont do this because somtimes classes can error
		// this.removeInvalidSubTrees(tree);

		//remove non hon matching coreqs here
		//this is ghetto atm... TODO FIX
		this.groupByHonors(tree);


		this.simplifyTree(tree)
		
		this.sortTree(tree);
		
		this.addDepthLevel(tree);
		
		this.addAllParentRelations(tree);

		
		this.addLowestParent(tree);


		render.hideSpinner();
		render.go(tree);
		popup.go(tree);
		help.go(tree);
		callback(null,tree);
	}.bind(this));

}





TreeMgr.prototype.TreeMgr=TreeMgr;
window.treeMgr = new TreeMgr();
