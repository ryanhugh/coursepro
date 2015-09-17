'use strict';

function TreeMgr () {
	this.DATASTATUS_NOTSTARTED = 0;
	this.DATASTATUS_LOADING = 1;
	this.DATASTATUS_DONE = 2;
	this.DATASTATUS_FAIL = 3;


	this.host = null;
	this.termId = null;

	this.spinner = document.getElementById('spinner')
	this.spinner.remove()
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

TreeMgr.prototype.fetchFullTreeOnce = function(item,queue,ignoreClasses) {
  if (ignoreClasses===undefined) {
    ignoreClasses = [];
  }
  
  //dont load classes that are on ignore list
  var compareObject = {
    classId:item.classId,
    subject:item.subject
  }
  
  //pass down all processed classes
  //so if the class has itself as a prereq, or a class that is above it,
  //there is no infinate recursion
  //common for coreqs that require each other
  if (_.any(ignoreClasses, _.matches(compareObject))) {
    return;
  }
  ignoreClasses.push(compareObject)
  	

	//fire off ajax and add it to queue
	if (tree.isClass && tree.dataStatus===this.DATASTATUS_NOTSTARTED) {

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


				callback();
			}.bind(this));
		}.bind(this))
	}
	
	// if (tree.coreqs && tree.coreqs.values.length>0) {
	// 	//fetch coreqs
	// 	queue.defer(function(callback){
	// 	  request({
	// 				url:'/listClasses',
	// 				type:'POST',
	// 				body:{
	// 					classId:tree.classId,
	// 					subject:tree.subject,
	// 					host:this.host,
	// 					termId:this.termId
	// 				}
	// 	  },function(err,body){
		    
	// 	  }.bind(this))
	// 	})
	// };
	
	
	
	//load coreqs
	if (item.coreqs) {
	  item.coreqs.values.forEach(function(subTree) {
	    this.fetchFullTreeOnce(subTree,queue,ignoreClasses);
	  }.bind(this));
	}
	

	//fetch its values too
	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.fetchFullTreeOnce(subTree,queue)
		}.bind(this))
	}
}
TreeMgr.prototype.fetchFullTree = function(tree,count,callback) {
	if (!count) {
		console.log('error count undefined not supported yet')
		return;
	};


	async.whilst(function () {
		if (count===undefined) {
			return true;//how is this going to break??
		}

		if (count>0) {
			return true;
		}
		else {
			return false;
		};
	}.bind(this),
	function (callback) {
		count--;

		var q = queue()
		this.fetchFullTreeOnce(tree,q);
		q.awaitAll(callback);
	}.bind(this), callback)
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
}

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

TreeMgr.prototype.findFlattendClassList = function(tree) {
	var retVal = [];
	if (tree.isClass) {
		retVal.push(tree);
	}

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			retVal=retVal.concat(this.findFlattendClassList(subTree));
		}.bind(this))
	};
	return retVal;
}
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
	this.host = host;
	this.termId  = termId;


	var tree = {
		subject:subject,
		classId:classId,
		isClass:true,
		dataStatus:this.DATASTATUS_NOTSTARTED
	}

	render.clearContainer()

	this.spinner.style.display = ''
	render.container.appendChild(this.spinner)



	this.fetchFullTree(tree,10,function () {
		this.simplifyTree(tree)
		this.sortTree(tree);


		this.spinner.style.display = 'none'



		this.addDepthLevel(tree);
		var flatClassList = this.findFlattendClassList(tree).sort(function (a,b) {
			return a.depth>b.depth;
		}.bind(this));
		console.log(flatClassList)
		// addMainParentRelations(tree);
		// this.removeDuplicateDeps(tree,flatClassList);
		// this.removeDuplicateDeps(tree,flatClassList);
		// this.removeDuplicateDeps(tree,flatClassList);
		this.addAllParentRelations(tree);

		spinner.style.display = 'none'


		// var a = findFlattendClassList(tree)
		// var uniqueArray = a.filter(function(item, pos) {
		//     return a.indexOf(item) == pos;
		// })

		// console.log(uniqueArray,'fd')


		// return;


		render.go(tree);
		popup.go(tree)
	}.bind(this));
}




TreeMgr.prototype.TreeMgr=TreeMgr;
window.treeMgr = new TreeMgr();
