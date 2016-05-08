'use strict';
var macros = require('../macros');
var _ = require('lodash')

function TreeMgr() {

}


TreeMgr.prototype.simplifyTree = function (tree) {
	if (tree.prereqs.values.length == 0) {
		return;
	}

	//remove duplicates
	var newTreeValues = [];
	tree.prereqs.values.forEach(function (subTree) {
		if (!_.some(newTreeValues, _.matches(subTree))) {
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


//for every node in the tree
//if there exists a class later in classList that is not equal to it (could have same depth, classList is sorted by depth)
//node becomes the node found (set parent's values)
TreeMgr.prototype.mergeDuplicateClasses = function (tree) {
	var classList = this.findFlattendClassList(tree, true).sort(function (a,b) {
		if (a.depth < b.depth) {
			return -1;
		}
		else if (a.depth > b.depth) {
			return 1
		}
		return 0;
	}.bind(this))

	//breath first search down the tree
	var stack = [tree];

	var currTree;
	while ((currTree = stack.shift())) {

		if (!currTree.isClass) {
			stack = stack.concat(currTree.prereqs.values)
			continue;
		}


		var matchingClasses = _.filter(classList, {
			_id: currTree._id
		});

		//at minimum this tree exists in the classList, so it should be at least 1
		if (matchingClasses.length === 0) {
			console.log('ERROR: no matching classes?!?');
		}

		var lowestTree = matchingClasses[matchingClasses.length - 1];



		//if tree not the lowest tree, replace
		if (currTree !== lowestTree) {

			//switch all references to currTree to lowestTree
			currTree.allParents.forEach(function (parentTree) {

				if (!_(parentTree.prereqs.values).includes(currTree)) {
					console.log('error parent does not include subtree');
				}

				//remove the tree
				_.pull(parentTree.prereqs.values, currTree);

				//and add the new lowest tree if it is not already part of the values
				if (!_(parentTree.prereqs.values).includes(lowestTree)) {
					parentTree.prereqs.values.push(lowestTree);
				}

				if (!_(lowestTree.allParents).includes(parentTree)) {
					lowestTree.allParents.push(parentTree)
				}

				if (_(parentTree.prereqs.values).includes(currTree)) {
					console.log("ERROR something bad yo")
					debugger
				}

			}.bind(this));

			//currTree's values need to point to lowestTree
			// currTree.prereqs.values.forEach(function (subTree) {

				//remove the node to be removed
				// _.pull(subTree.allParents, currTree)

				//and add its replacement, the lowest tree, if it is not already there
				// if (!_(subTree.allParents).includes(lowestTree)) {
				// 	subTree.allParents.push(lowestTree)
				// }
			// }.bind(this))

			currTree.prereqs.values = []
			currTree.coreqs.values = []
			currTree.allParents.values = []
			currTree.depth = 99
			currTree.name = 'DELETED'


			// return;
		}

		//if two duplicated trees exist, we dont want to process both of their prereqs
		//so only process the one that is last in the classList array
		stack = stack.concat(currTree.prereqs.values)
	}
}


// returns all of a tree's prereq's parents, dups removed
TreeMgr.prototype.getNeighbors = function (tree) {

	var retVal = [];
	tree.prereqs.values.forEach(function (subTree) {
		subTree.allParents.forEach(function (neighborTree) {
			if (!_(retVal).includes(neighborTree)) {
				retVal.push(neighborTree)
			}

		}.bind(this))
	}.bind(this))
	return retVal;
}

TreeMgr.prototype.getSubsets = function (bigSet) {
	var loopTo = (1 << bigSet.length);
	var retVal = [];
	for (var i = 0; i < loopTo; i++) {
		var smallSet = [];

		for (var j = 0; j < bigSet.length; j++) {
			if (1 << j & i) {
				smallSet.push(bigSet[j])
			}
		}
		retVal.push(smallSet)
	}
	return retVal;
}


TreeMgr.prototype.groupByCommonPrereqs = function (tree) {

	var parents = this.getNeighbors(tree);

	var maxScore = 0;
	var matchParents = [];
	var matchChildren = [];
	this.getSubsets(parents).forEach(function (thisParentsSet) {

		if (thisParentsSet.length < 2) {
			return;
		}

		// find the children which these parents share
		var children = _.filter(tree.prereqs.values, function (child) {
			if (!child.allParents) {
				return false;
			}



			//ensure that this child has all the matched parents
			for (var i = 0; i < thisParentsSet.length; i++) {
				if (!_(child.allParents).contains(thisParentsSet[i])) {
					return false;
				}
			}
			return true;
		}.bind(this));

		//calculate the score of this set
		var linesRemoved = parents.length * children.length - parents.length - children.length;

		if (linesRemoved > maxScore) {
			matchParents = parents;
			matchChildren = children;
			console.log('new max with ', parents, children)
		}
	}.bind(this));


	// this transform will add lines, dont do it
	if (linesRemoved < 0 || matchParents.length < 2 || matchChildren.length < 2) {
		return;
	}

	console.log('all matching nodes:', matchChildren)

	var newNode = {
		isClass: false,
		_id: Math.random(),
		allParents: matchParents,
		prereqs: {
			type: 'or', //TODO FIXXX
			values: matchChildren
		},
		coreqs: {
			type: 'or',
			values: []
		}
	}

	matchParents.forEach(function (parent) {

		//remove any .values in matchChildren
		matchChildren.forEach(function (newChild) {
			_.pull(parent.prereqs.values, newChild)
		}.bind(this))

		parent.prereqs.values.push(newNode);
	}.bind(this))


	matchChildren.forEach(function (newChild) {

		matchParents.forEach(function (parent) {
			_.pull(newChild.allParents, parent);
		}.bind(this))

		newChild.allParents.push(newNode);

	}.bind(this))


	tree.prereqs.values.forEach(function (subTree) {
		this.groupByCommonPrereqs(subTree);
	}.bind(this));


	//PRETTY sure everything would have to be same type (or vs and)

	//for every parent:
	//any values in matchChildren remove
	//add newNode

	//for every child:
	//remove any parent in toSimplify
	//add newNode




}



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
// if allNodes is set, use all nodes instead of just classes
TreeMgr.prototype.findFlattendClassList = function (tree, allNodes) {
	var retVal = [];
	if (tree.isClass || allNodes) {
		retVal.push(tree);
	}

	if (!tree.isClass || allNodes) {
		tree.prereqs.values.forEach(function (subTree) {
			retVal = retVal.concat(this.findFlattendClassList(subTree, allNodes));
		}.bind(this))
	};
	retVal = _.uniq(retVal)
	return retVal;
}


TreeMgr.prototype.flattenCoreqs = function (tree) {

	if (tree.coreqs) {
		var flatCoreqs = [];

		tree.coreqs.values.forEach(function (subTree) {
			flatCoreqs = flatCoreqs.concat(this.findFlattendClassList(subTree, false));
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


TreeMgr.prototype.logTree = function (tree, body) {

	//tell the server how big this tree is
	body.classCount = this.countClassesInTree(tree);

	console.log('The tree is ', body.classCount, ' big');
	tree.logTree(body)

};
TreeMgr.prototype.defaultToOr = function (tree) {

	//if this class is a coreq to another class, remove its coreqs
	if (tree.prereqs.length < 2) {
		tree.prereqs.type = 'or'
	}


	tree.coreqs.values.forEach(function (subTree) {
		this.defaultToOr(subTree);
	}.bind(this))

	tree.prereqs.values.forEach(function (subTree) {
		this.defaultToOr(subTree);
	}.bind(this));
};


TreeMgr.prototype.getd3JSON = function (tree) {
	var nodes = this.findFlattendClassList(tree, true);
	var connections = {}
	var counts = {}

	nodes.forEach(function (node, nodeIndex) {
		node.prereqs.values.forEach(function (subTree) {
			if (!_(subTree.allParents).includes(node)) {
				console.log("ERROR ");
				debugger
			}
			if (subTree._id == '572e949714907ce51d0c3a8f') {
				debugger
			}


			var subTreeIndex = nodes.indexOf(subTree)
			var key = [node._id, nodeIndex, subTree._id, subTreeIndex].sort().join('')

			// console.log(key, node, subTree);
			if (!counts[key]) {
				counts[key] = 0
			}
			counts[key]++

				if (connections[key]) {
					console.log("duplicate link between ", node, subTree);
					return;
				}
				else {
					connections[key] = {
						"source": nodeIndex,
						"target": subTreeIndex,
						"value": 4
					}
				}
		}.bind(this))
	}.bind(this))

	var outputNodes = []
	nodes.forEach(function (node) {

		var newValue = {
			_id: node._id
		}

		if (node.name) {
			newValue.name = node.name
		}
		else {
			newValue.name = 'filler'
		}

		newValue.group = node.depth

		outputNodes.push(newValue)


	}.bind(this))
	console.log(_.values(counts));

	console.log(JSON.stringify({
		"nodes": outputNodes,
		"links": _.values(connections)
	}));

};

// http://localhost/#/graph/swarthmore.edu/201604/MATH/043


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



	this.defaultToOr(tree);

	// this.mergeDuplicateClasses(tree)


	this.addLowestParent(tree);

	this.getd3JSON(tree)



	if (!tree.isClass) {
		tree.hidden = true;
	};
}

TreeMgr.prototype.TreeMgr = TreeMgr;
module.exports = new TreeMgr();


console.warn('test line here')
window.treeMgr = module.exports
