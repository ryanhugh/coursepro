'use strict';
var request = require('./request')
var macros = require('./macros')


function TreeMgr() {

}


TreeMgr.prototype.simplifyTree = function (tree) {
	if (tree.prereqs.values.length == 0) {
		return;
	}

	//remove duplicates
	var newTreeValues = [];
	tree.prereqs.values.forEach(function (subTree) {
		if (!_.any(newTreeValues, _.matches(subTree))) {
			newTreeValues.push(subTree)
		}
	}.bind(this))
	tree.prereqs.values = newTreeValues;


	//if values is only 1 long to a circle, delete circle and bring lines straight to parent
	//if values is only 1 long from panel to circle, same as above
	if (tree.prereqs.values.length == 1) {
		if (!tree.prereqs.values[0].isClass) {
			tree.prereqs.type = tree.prereqs.values[0].prereqs.type;
			tree.prereqs.values = tree.prereqs.values[0].prereqs.values;
		}

		if (!tree.isClass) {

			//if node -> panel, copy panel attrs to node
			var subTree = tree.prereqs.values[0];

			//clear all the values in the tree
			for (var attrName in tree) {
				tree[attrName] = undefined;
			}

			//then copy up all the subtree values
			for (var attrName in subTree) {
				tree[attrName] = subTree[attrName]
			}
		}

	};



	//if type of dep is the same, merge cs 2800
	newTreeValues = [];
	tree.prereqs.values.forEach(function (subTree) {

		if (!subTree.isClass && subTree.prereqs.type == tree.prereqs.type) {
			newTreeValues = newTreeValues.concat(subTree.prereqs.values);
		}
		else {
			newTreeValues.push(subTree)
		}

	}.bind(this))
	tree.prereqs.values = newTreeValues


	//just changes the single red lines to blue
	//if there is only 1 option it dosent matter if its "or" or "and"
	if (tree.prereqs.values.length === 1) {
		tree.prereqs.type = 'or'
	}

	//recursion
	tree.prereqs.values.forEach(function (subTree) {
		this.simplifyTree(subTree);
	}.bind(this))
}


TreeMgr.prototype.sortTree = function (tree) {
	if (tree.prereqs.values.length == 0) {
		return;
	}


	var sizes = [];
	var subTrees = [];

	//subTrees with no values are sorted by classId
	var subPanels = [];

	tree.prereqs.values.forEach(function (subTree) {
		if (!subTree.prereqs.values || subTree.prereqs.values.length === 0) {
			subPanels.push(subTree);
		}
		else {
			subTrees.push(subTree)
			sizes.push({
				tree: subTree,
				size: this.countClassesInTree(subTree)
			})
		}
	}.bind(this))


	//sort the panels by classId
	subPanels.sort(function (a, b) {
		return a.compareTo(b)
	}.bind(this))


	//sort the trees so the largest ones are on the outside
	subTrees.sort(function (a, b) {
		var asize;
		var bsize;

		sizes.forEach(function (item) {
			if (item.tree === a) {
				asize = item.size;
			}
			if (item.tree === b) {
				bsize = item.size;
			}
		})
		return asize > bsize;
	}.bind(this))

	var odds = [];
	var evens = [];

	subTrees.forEach(function (subTree, index) {
		if (index % 2 === 0) {
			evens.push(subTree);
		}
		else {
			odds.push(subTree);
		}
	}.bind(this))

	evens.reverse();

	tree.prereqs.values = evens.concat(subPanels.concat(odds))

	tree.prereqs.values.forEach(function (subTree) {
		this.sortTree(subTree);
	}.bind(this))
}


//counts all classes, coreqs and prereqs
TreeMgr.prototype.countClassesInTree = function (tree) {

	var retVal;

	if (tree.isClass) {
		retVal = 1;
	}
	else {
		retVal = 0;
	}

	tree.prereqs.values.forEach(function (subTree) {
		retVal += this.countClassesInTree(subTree);
	}.bind(this))

	tree.coreqs.values.forEach(function (subTree) {
		retVal += this.countClassesInTree(subTree);
	}.bind(this))

	return retVal;
}



TreeMgr.prototype.addAllParentRelations = function (tree, parent) {
	if (!tree.allParents) {
		tree.allParents = [];
	}

	if (parent && tree.allParents.indexOf(parent) < 0) {
		tree.allParents.push(parent)
		if (tree.allParents.length > 1) {
			console.log('added a second parent on ', tree.subject, tree.classId)
		};
	}

	tree.prereqs.values.forEach(function (subTree) {
		this.addAllParentRelations(subTree, tree);
	}.bind(this))


	tree.coreqs.values.forEach(function (subTree) {
		this.addAllParentRelations(subTree, tree);
	}.bind(this))
}


TreeMgr.prototype.addLowestParent = function (tree) {
	if (tree.allParents.length === 0) {
		tree.lowestParent = null;
	}
	else {

		tree.lowestParent = tree.allParents[0];
		for (var i = 0; i < tree.allParents.length; i++) {
			if (tree.allParents[i].depth > tree.lowestParent) {
				tree.lowestParent = tree.allParents[i];
			}
		}
	}


	tree.prereqs.values.forEach(function (subTree) {
		this.addLowestParent(subTree);
	}.bind(this))

	tree.coreqs.values.forEach(function (subTree) {
		this.addLowestParent(subTree);
	}.bind(this))
}


//currenly used to flatten coreq trees (which are usally flat anyway)
TreeMgr.prototype.getFirstLayer = function (tree) {
	if (!tree.prereqs.values) {
		return [];
	};


	if (tree.isClass) {
		return tree.prereqs.values;
	}
	else {
		var values = [];
		tree.prereqs.values.forEach(function (subTree) {
			values = values.concat(this.getFirstLayer(subTree));

		}.bind(this));
		return values;
	}
};



TreeMgr.prototype.addDepthLevel = function (tree, depth) {
	if (depth === undefined) {
		depth = 0
	}
	tree.depth = depth;

	tree.prereqs.values.forEach(function (subTree) {
		this.addDepthLevel(subTree, depth + 1);
	}.bind(this))
}

// only recurses on nodes and not classes - finds a list of classes
TreeMgr.prototype.findFlattendClassList = function (tree) {
	var retVal = [];
	if (tree.isClass) {
		retVal.push(tree);
	}

	if (!tree.isClass) {
		tree.prereqs.values.forEach(function (subTree) {
			retVal = retVal.concat(this.findFlattendClassList(subTree));
		}.bind(this))
	};
	return retVal;
}


TreeMgr.prototype.flattenCoreqs = function (tree) {

	if (tree.coreqs) {
		var flatCoreqs = [];

		tree.coreqs.values.forEach(function (subTree) {
			flatCoreqs = flatCoreqs.concat(this.findFlattendClassList(subTree));
		}.bind(this));

		flatCoreqs.forEach(function (subTree, index) {
			subTree.coreqIndex = index;
			subTree.isCoreq = true;

			//delete the coreq's prereq's, for now
			subTree.prereqs.values = [];
		}.bind(this))

		tree.coreqs.values = flatCoreqs;
	}


	tree.prereqs.values.forEach(function (subTree) {
		this.flattenCoreqs(subTree)
	}.bind(this));
};


TreeMgr.prototype.removeCoreqsCoreqs = function (tree, isACoreq) {

	//if this class is a coreq to another class, remove its coreqs
	if (isACoreq) {
		tree.coreqs.values = [];
	}


	tree.coreqs.values.forEach(function (subTree) {
		this.removeCoreqsCoreqs(subTree, true);
	}.bind(this))

	tree.prereqs.values.forEach(function (subTree) {
		this.removeCoreqsCoreqs(subTree);
	}.bind(this));
};


//remove (hon) labs on non hon classes, and remove non (hon) labs on non hon classes
//the proper way to do this is scrape the honors attribute from banner, and group by that, but for now just match title
TreeMgr.prototype.groupByHonors = function (tree) {


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
		filteredCoreqs.forEach(function (subTree, index) {
			subTree.coreqIndex = index;
		}.bind(this))

		tree.coreqs.values = filteredCoreqs;
	}



	tree.prereqs.values.forEach(function (subTree) {
		this.groupByHonors(subTree);
	}.bind(this));
};


TreeMgr.prototype.logTree = function(tree,body) {
	
	//tell the server how big this tree is
	body.classCount = this.countClassesInTree(tree);

	console.log('The tree is ', body.classCount, ' big');
	tree.logTree(body)
	
};


// TreeMgr.prototype.processTree = function(tree, callback) {
TreeMgr.prototype.go = function (tree) {

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
}



TreeMgr.prototype.TreeMgr = TreeMgr;
module.exports = new TreeMgr();