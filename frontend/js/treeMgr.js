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

		// if (hasAlreadyLoaded) {
		// 	console.log('ignoring',tree.subject,tree.classId,ignoreClasses,tree)
		// }

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
					body:{
						classId:tree.classId,
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
	if (tree.values.length==1 && !tree.values[0].isClass) {
		tree.type = tree.values[0].type;
		tree.values = tree.values[0].values;
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
				size:JSON.stringify(subTree).length
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
		if (aId===bId) {
			return 0;
		}
		if (aId<bId) {
			return -1;
		};
		console.log('error ,wtf',a,b,aId,bId)
		return 0

	})


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

TreeMgr.prototype.removeDuplicateDeps = function(tree,classList) {
	if (!tree.values) {
		return
	}
	var valuesToRemove = [];

	var newTreeValues = []

	tree.values.forEach(function (subTree,index) {
		if (!subTree.isClass) {
			newTreeValues.push(subTree)
			return;
		}

		var found = false;
		for (var i = 0; i < classList.length; i++) {
			var replacement = classList[i]
			if (subTree.isString!==replacement.isString) {
				continue;
			};
			if (replacement.depth<=subTree.depth) {
				continue;
			};
			if (replacement===subTree) {
				continue;
			};



			//need to match on subject and classId or _equal (_equal will get both nodes and strings)

			if ((subTree.subject==replacement.subject && subTree.classId==replacement.classId && !subTree.isString) || (subTree.isString && subTree.desc===replacement.desc)) {
				// valuesToRemove.push(subTree);

				// if (!replacement.allParents) {
				// 	replacement.allParents = [replacement.parent];
				// }

				// if (replacement.allParents.indexOf(subTree.parent)<0) {
				// 	replacement.allParents.push(subTree.parent);
				// 	if (replacement.allParents.length>1) {
				// 		console.log('added a second parent on ',replacement.subject,replacement.classId)
				// 	};
				// }



				// also need to copy values
				if (subTree.dataStatus === this.DATASTATUS_DONE && replacement.dataStatus !== this.DATASTATUS_DONE) {
					console.log('copying data')
					for (var attrName in subTree) {
						if (attrName == "parent") {
							console.log("wtf ERROR !!!!!!!!!!!!!!!!!1")
							continue;
						}
						replacement[attrName] = subTree[attrName]
					}
				}


				// just for sanity
				// if (subTree.values) {
				// 	subTree.values.forEach(function (item) {
				// 		item.parent = 'uh oh';
				// 	})
				// };
				// if (replacement.parent=='uh oh') {
				// 	console.log('!!!!!!!!!!!!!!!!!!')
				// };
				found = true;
				newTreeValues.push(replacement);


				// tree.values[index]=replacement;
				// console.log('replacing tree at indx ',index,replacement.parent)
				break;
			}
		}
		if (!found) {
			// subTree.parent = tree;
			// if (subTree.parent=='uh oh') {
			// 	console.log('found!!!')
			// };
			newTreeValues.push(subTree);
		};
	})
	//

	if (newTreeValues.length !== tree.values.length) {
		console.log("error!!! length is different")
		throw new Error("Something went badly wrong!");
	};


	tree.values = newTreeValues;

	// tree.values.forEach(function (subTree,index) {
	// 	if (subTree.parent=='uh oh') {
	// 		console.log('error parent is uh oh',subTree,tree.subject,tree.classId,index)
	// 		throw new Error("Something went badly wrong!");
	// 	};
	// })

	//remove the values to remove
	
	//NEED TO COPY VALUES TO REPLACEMENT
	valuesToRemove.forEach(function (subTree) {
		var index = tree.values.indexOf(subTree);
		tree.values.splice(index,1)
		console.log('removing',subTree.subject,subTree.classId)
	}.bind(this))


	tree.values.forEach(function (subTree) {
		this.removeDuplicateDeps(subTree,classList)
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
	this.processTree(tree);

}
TreeMgr.prototype.showClasses = function(classList) {
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
	

	this.convertServerData(tree);

	//this is ghetto
	tree.values.forEach(function (subTree) {
		subTree.values = []
	}.bind(this))

	
	this.processTree(tree,function () {

		//hide the node at the top and the lines to it
		tree.panel.style.display='none'

		tree.values.forEach(function (subTree) {
			subTree.lineToParent.style.display='none';
		}.bind(this))
		
	}.bind(this));


};

TreeMgr.prototype.processTree = function(tree,callback) {
	this.host = tree.host;
	this.termId  = tree.termId;

	if (!callback) {
		callback=function(){};
	};

	render.clearContainer()
	render.showSpinner()
	this.fetchFullTree(tree,function () {

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

		//this code was to avoid duplicate classes if a given class is low on a big tree
		//it dosent work

		// var flatClassList = this.findFlattendClassList(tree).sort(function (a,b) {
		// 	return a.depth>b.depth;
		// }.bind(this));
		// console.log(flatClassList)
		// addMainParentRelations(tree);
		// this.removeDuplicateDeps(tree,flatClassList);
		// this.removeDuplicateDeps(tree,flatClassList);
		// this.removeDuplicateDeps(tree,flatClassList);
		// this.addAllParentRelations(tree);
		this.addLowestParent(tree);

		// var a = findFlattendClassList(tree)
		// var uniqueArray = a.filter(function(item, pos) {
		//     return a.indexOf(item) == pos;
		// })

		// console.log(uniqueArray,'fd')


		render.hideSpinner();
		render.go(tree);
		popup.go(tree);
		help.go(tree);
		callback();
	}.bind(this));

}



TreeMgr.prototype.TreeMgr=TreeMgr;
window.treeMgr = new TreeMgr();
