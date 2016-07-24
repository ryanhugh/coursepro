'use strict';
var macros = require('../macros');
var _ = require('lodash')

var Class = require('../Class')
var user = require('../user');

function TreeMgr() {

}

TreeMgr.prototype.addIdsToTrees = function (tree) {

	tree.prereqs.values.forEach(function (subTree) {
		this.addIdsToTrees(subTree);
	}.bind(this))

	tree.coreqs.values.forEach(function (subTree) {
		this.addIdsToTrees(subTree);
	}.bind(this))

	tree.generateIdFromPrereqs()
};

// this dosen't work after allParents have been added
TreeMgr.prototype.simplifyTree = function (tree) {
	if (tree.prereqs.values.length == 0) {
		return;
	}

	//remove duplicates
	var newTreeValues = [];
	tree.prereqs.values.forEach(function (subTree) {
		for (var i = 0; i < newTreeValues.length; i++) {
			if (newTreeValues[i]._id === subTree._id) {
				return;
			}
		}
		newTreeValues.push(subTree);
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

// one part of the above function that runs after the node injection that changes allParents...
TreeMgr.prototype.skipNodesPostStuff = function (tree) {

	var shouldMatch = tree.prereqs.values.length === 1 && !tree.isClass;

	if (!shouldMatch) {
		// eliminate current node if
		//            O
		//            | <- same type as lines 2 lines down
		//            . <- eliminate this one
		//          / |
		//         O  O
		shouldMatch = tree.allParents.length === 1 && tree.allParents[0].prereqs.type == tree.prereqs.type && !tree.isClass
	}

	if (shouldMatch) {
		tree.DELETED2 = true;

		console.log('Removing in skipNodesPostStuff', tree)

		var newChildren = tree.prereqs.values;

		newChildren.forEach(function (newChild) {
			_.pull(newChild.allParents, tree);
		}.bind(this))

		tree.allParents.forEach(function (parent) {

			// remove this tree from parents
			_.pull(parent.prereqs.values, tree)

			// and add new child
			newChildren.forEach(function (newChild) {
				if (!_(parent.prereqs.values).includes(newChild)) {
					parent.prereqs.values.push(newChild)
				}
				if (!_(newChild.allParents).includes(parent)) {
					newChild.allParents.push(parent)
				}
			}.bind(this))
		}.bind(this))


		// Because we added nodes to the parent's 
		// process them again
		tree.allParents.forEach(function (parent) {
			//recursion
			parent.prereqs.values.forEach(function (subTree) {
				this.skipNodesPostStuff(subTree);
			}.bind(this))
		}.bind(this))
	}
	else {
		//recursion
		tree.prereqs.values.forEach(function (subTree) {
			this.skipNodesPostStuff(subTree);
		}.bind(this))
	}
};

TreeMgr.prototype.sortTree = function (tree) {
	if (tree.prereqs.values.length == 0) {
		return;
	}


	var sizes = [];
	var subTrees = [];

	//subTrees with no values are sorted by classUid
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


	//sort the panels by classUid
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

	// This accounts for circular references in the graph
	return this.findFlattendClassList(tree, true, true).length;
}



TreeMgr.prototype.addAllParentRelations = function (tree, parent) {
	if (!tree.allParents) {
		tree.allParents = [];
	}

	if (parent && !_(tree.allParents).includes(parent)) {
		tree.allParents.push(parent)
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
//if there exists a class later in classList that is not equal to it 
//node becomes the node found (set parent's values)
// order of class list dosen't matter - only thing that matters here is that duplicate classes are removed

// this is the problem that the physics labs were coming up
// this function changes this

// a    b
// |\   |\
// | \  | \
// c  d c  d

// into this

// a    b
// | \ /|
// | / \|
// c    d
// (assuming everything is "or" for this example)
TreeMgr.prototype.mergeDuplicateClasses = function (tree) {
	var classList = this.findFlattendClassList(tree, true)

	//breath first search down the tree
	var stack = [tree];

	var deletedTrees = [];

	var currTree;
	while ((currTree = stack.shift())) {
		if (currTree.isClass) {
			stack = stack.concat(currTree.prereqs.values)
			continue
		}
		if (_(deletedTrees).includes(currTree)) {
			continue;
		}

		var matchingClasses = _.filter(classList, {
			_id: currTree._id
		});

		//at minimum this tree exists in the classList, so it should be at least 1
		if (matchingClasses.length === 0) {
			elog('ERROR: no matching classes?!?');
		}

		var lowestTree = matchingClasses[matchingClasses.length - 1];



		//if tree not the lowest tree, replace
		if (currTree !== lowestTree) {
			console.log("Swaping !", currTree, 'for', lowestTree);

			//switch all references to currTree to lowestTree
			currTree.allParents.forEach(function (parentTree) {

				if (!_(parentTree.prereqs.values).includes(currTree)) {
					elog('error parent does not include subtree');
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
					elog("ERROR something bad yo")
				}

			}.bind(this));

			// currTree's values need to point to lowestTree
			currTree.prereqs.values.forEach(function (subTree) {

				// remove the node to be removed
				_.pull(subTree.allParents, currTree)

			}.bind(this))

			currTree.DELETED = true

			deletedTrees.push(currTree);

		}

		//if two duplicated trees exist, we dont want to process both of their prereqs
		//so only process the one that is last in the classList array
		stack = stack.concat(currTree.prereqs.values)
	}
}


// returns all of a tree's parent's prereqs, dups removed. 
TreeMgr.prototype.getUpwardNeighbors = function (tree) {

	var retVal = [];
	tree.allParents.forEach(function (parent) {
		parent.prereqs.values.forEach(function (neighborTree) {
			if (!_(retVal).includes(neighborTree)) {
				retVal.push(neighborTree)
			}

		}.bind(this))
	}.bind(this))
	return retVal;
}

// returns all of a tree's prereq's parents, dups removed. 
TreeMgr.prototype.getDownwardNeighbors = function (tree) {

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


// converts this (output from mergeDuplicateClasses)

// a    b
// | \ /|
// | / \|
// c    d

// into this
// (assuming everything is "or" for this example)

// a   b
//  \ /
//   o
//  / \
// c   d
// 
TreeMgr.prototype.groupByCommonPrereqs = function (tree, prereqType) {

	var parents = this.getDownwardNeighbors(tree);

	var maxScore = 0;
	var matchParents = [];
	var matchChildren = [];
	this.getSubsets(parents).forEach(function (thisParentsSet) {
		if (thisParentsSet.length < 2) {
			return;
		}

		// if all parents in this set don't match the given prereq type, drop this set
		for (var i = thisParentsSet.length - 1; i >= 0; i--) {
			if (thisParentsSet[i].prereqs.type !== prereqType) {
				return;
			}
		}

		// find the children which these parents share
		var children = _.filter(tree.prereqs.values, function (child) {
			if (!child.allParents) {
				return false;
			}

			//ensure that this child has all the matched parents
			for (var i = 0; i < thisParentsSet.length; i++) {
				if (!_(child.allParents).includes(thisParentsSet[i])) {
					return false;
				}
			}
			return true;
		}.bind(this));

		//calculate the score of this set
		var linesRemoved = thisParentsSet.length * children.length - thisParentsSet.length - children.length;

		if (linesRemoved >= maxScore) {
			maxScore = linesRemoved
			matchParents = thisParentsSet;
			matchChildren = children;
			console.log('new max with ', thisParentsSet, children, maxScore)
		}
	}.bind(this));

	// this transform will add lines, dont do it
	if (maxScore >= 0 && matchParents.length > 1 && matchChildren.length > 1) {
		console.log('all matching nodes:', matchChildren)

		var newNode = Class.create({
			isClass: false,
			allParents: matchParents,

		})
		newNode.allParents = matchParents;
		newNode.prereqs = {
			type: prereqType,
			values: matchChildren
		}
		newNode.generateIdFromPrereqs();

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
	}


	tree.prereqs.values.forEach(function (subTree) {
		this.groupByCommonPrereqs(subTree, prereqType);
	}.bind(this));
}

TreeMgr.prototype.removeDepth = function (tree) {
	tree.depth = undefined

	tree.prereqs.values.forEach(function (subTree) {
		this.removeDepth(subTree);
	}.bind(this))

	tree.coreqs.values.forEach(function (subTree) {
		this.removeDepth(subTree);
	}.bind(this))
};

TreeMgr.prototype.addDepthLevel = function (tree, depth) {
	if (depth === undefined) {
		depth = 0
	}
	if (tree.depth === undefined || tree.depth < depth) {
		tree.depth = depth
	}

	tree.prereqs.values.forEach(function (subTree) {
		this.addDepthLevel(subTree, depth + 1);
	}.bind(this))
}

// only recurses on nodes and not classes - finds a list of classes
// if allNodes is set, use all nodes instead of just classes
TreeMgr.prototype.findFlattendClassList = function (tree, allNodes, includeCoreqs) {
	var retVal = [];
	if (tree.isClass || allNodes) {
		retVal.push(tree);
	}

	if (!tree.isClass || allNodes) {
		tree.prereqs.values.forEach(function (subTree) {
			retVal = retVal.concat(this.findFlattendClassList(subTree, allNodes, includeCoreqs));
		}.bind(this))

		if (includeCoreqs) {
			tree.coreqs.values.forEach(function (subTree) {
				retVal = retVal.concat(this.findFlattendClassList(subTree, allNodes, includeCoreqs));
			}.bind(this))
		}
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


	var toVisit = [tree];
	var visited = [];

	var currTree;
	while ((currTree = toVisit.pop())) {
		if (_(visited).includes(currTree)) {
			continue;
		}
		visited.push(currTree)

		// for (var attrName in attrs) {
		// 	currTree[attrName] = attrs[attrName]
		// }

		currTree.prereqs.values.forEach(function (subTree) {
			subTree.isCoreq = currTree.isCoreq;
		}.bind(this))


		currTree.coreqs.values.forEach(function (subTree) {
			subTree.isCoreq = true;
			subTree.prereqs.values = []
			subTree.coreqs.values = [];
		}.bind(this))


		toVisit = toVisit.concat(currTree.prereqs.values).concat(currTree.coreqs.values);
	}

};


//remove (hon) labs on non hon classes, and remove non (hon) labs on non hon classes
TreeMgr.prototype.groupByHonors = function (tree) {
	if (tree.isClass && tree.coreqs) {

		var filteredCoreqs = [];
		tree.coreqs.values.forEach(function (subTree) {
			if (subTree.honors && tree.honors) {
				filteredCoreqs.push(subTree.clone());
			}

			// If there is no honors equivalent, add the non hon class
			else if (tree.honors && !subTree.honors) {
				for (var i = 0; i < tree.coreqs.values.length; i++) {
					var currTree = tree.coreqs.values[i];
					if (currTree == subTree) {
						continue;
					}
					if (currTree.classId == subTree.classId && currTree.honors && !subTree.honors) {
						return;
					}
				}
				filteredCoreqs.push(subTree.clone());
			}
			else if (!subTree.honors && !tree.honors) {
				filteredCoreqs.push(subTree.clone());
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
TreeMgr.prototype.defaultTo = function (tree, type) {

	//if this class is a coreq to another class, remove its coreqs
	if (tree.prereqs.values.length < 2) {
		tree.prereqs.type = type
	}


	tree.coreqs.values.forEach(function (subTree) {
		this.defaultTo(subTree, type);
	}.bind(this))

	tree.prereqs.values.forEach(function (subTree) {
		this.defaultTo(subTree, type);
	}.bind(this));
};

TreeMgr.prototype.getYGuessFromDepth = function (depth) {
	return depth * 250 + 50;
};

// guess node positions attempts to estimate the output position of the d3 graph
// set it to false if nodes already have positions
TreeMgr.prototype.treeToD3 = function (tree) {
	var nodes = this.findFlattendClassList(tree, true).sort(function (a, b) {
		if (a.depth < b.depth) {
			return -1;
		}
		else if (a.depth > b.depth) {
			return 1
		}
		return 0;
	}.bind(this));
	var connections = {}

	var coreqs = []

	nodes.forEach(function (node, nodeIndex) {
		coreqs = coreqs.concat(node.coreqs.values)
		node.prereqs.values.forEach(function (subTree) {
			if (!_(subTree.allParents).includes(node)) {
				elog("subtree dosent have node as parent", node, subTree);
			}


			var subTreeIndex = nodes.indexOf(subTree)
			var key = [node._id, nodeIndex, subTree._id, subTreeIndex].sort().join('')

			if (connections[key]) {
				elog("duplicate link between ", node, subTree);
				return;
			}
			else {
				connections[key] = {
					"source": node,
					"target": subTree,
					"value": 4
				}
			}
		}.bind(this))
	}.bind(this))

	if (nodes[0].x === undefined) {
		nodes[0].x = window.innerWidth / 2;
	}

	nodes.forEach(function (node) {

		if (node.x === undefined) {
			// Find average percent index * 1000, used as starting position for graph
			// dosen't need to be that close to where it needs to be, d3 will make it better
			var xSum = 0;
			node.allParents.forEach(function (nodeParent) {
				var index = nodeParent.prereqs.values.indexOf(node);
				var length = nodeParent.prereqs.values.length;
				if (!nodeParent.x) {
					elog('nodeParent dosent have an x but it was set above?', nodeParent)
				}

				// 300 is the guess distance between nodes
				xSum += ((index - (length - 1) / 2) * 300 + nodeParent.x)

			}.bind(this))

			node.x = xSum / node.allParents.length
		}

		if (node.y === undefined) {
			node.y = this.getYGuessFromDepth(node.depth)
		}

	}.bind(this))

	coreqs.forEach(function (coreq) {
		coreq.x = 0
		coreq.y = 0
	}.bind(this))

	nodes.concat(coreqs).forEach(function (node) {
		if (node.x === undefined || isNaN(node.x) || node.y === undefined || isNaN(node.y)) {
			elog('nope!', node)
		}
	}.bind(this))


	return {
		nodes: nodes.concat(coreqs),
		links: _.values(connections)
	}
};

TreeMgr.prototype.calculateIfChildrenAtSameDepth = function (tree) {
	var depth = null;

	tree.prereqs.values.forEach(function (subTree) {
		if (depth === null) {
			depth = subTree.depth
		}
		else if (depth !== subTree.depth) {
			tree.allChildrenAtSameDepth = false;
		}

		this.calculateIfChildrenAtSameDepth(subTree);
	}.bind(this))
};

TreeMgr.prototype.resetTree = function (tree) {
	var toVisit = [tree];
	var visited = [];

	var currTree;
	while ((currTree = toVisit.pop())) {
		if (_(visited).includes(currTree)) {
			continue;
		}
		visited.push(currTree)
		currTree.resetRequisites()
		tree.isExpanded = false;
		tree.showSelectPanel = false;

		toVisit = toVisit.concat(currTree.prereqs.values).concat(currTree.coreqs.values);

	}
};

TreeMgr.prototype.removeAllParents = function (tree) {
	tree.allParents = []

	tree.prereqs.values.forEach(function (subTree) {
		this.removeAllParents(subTree);
	}.bind(this));

	tree.coreqs.values.forEach(function (subTree) {
		this.removeAllParents(subTree);
	}.bind(this));

};

TreeMgr.prototype.simplifyIfSelected = function (tree) {
	var satisfyingNode = this.getSatisfyingNode(tree);
	if (!tree.savePrereqsForThisGraph) {
		tree.savePrereqsForThisGraph = tree.prereqs
	}
	if (satisfyingNode) {

		// make a new object so don't mess with savePrereqsForThisGraph
		tree.prereqs = {
			values: [satisfyingNode],
			type: 'or'
		}
	}
	else {
		tree.prereqs = tree.savePrereqsForThisGraph
	}

	tree.prereqs.values.forEach(function (subTree) {
		this.simplifyIfSelected(subTree);
	}.bind(this));
};

// returns a node or null
TreeMgr.prototype.getSatisfyingNode = function (tree) {
	if (tree.prereqs.type == 'and') {
		return null;
	}

	for (var i = 0; i < tree.prereqs.values.length; i++) {
		var subTree = tree.prereqs.values[i];
		if (subTree.isClass) {

			// make user support classes that are strings
			if (subTree.isString) {
				elog('Cant check subTree that isnt a string not supported yet!')
				continue;
			}

			if (user.getListIncludesClass('selected', subTree)) {
				return subTree;
			}
		}
		else {
			if (this.getSatisfyingNode(subTree)) {
				return subTree;
			}
		}
	}
	return null;
};

TreeMgr.prototype.setWouldSatisfy = function (tree) {
	if (tree.isCoreq) {
		tree.wouldSatisfyNode = tree.lowestParent.wouldSatisfyNode
	}
	else {
		tree.wouldSatisfyNode = this.wouldSatisfyNode(tree)
	}

	tree.prereqs.values.forEach(function (subTree) {
		this.setWouldSatisfy(subTree);
	}.bind(this));

	tree.coreqs.values.forEach(function (subTree) {
		this.setWouldSatisfy(subTree);
	}.bind(this));
};

// returns true if this tree would satisfy a node if selected and make the graph simpler,
// else it returns false
TreeMgr.prototype.wouldSatisfyNode = function (tree) {
	for (var i = 0; i < tree.allParents.length; i++) {
		var parent = tree.allParents[i];
		if (parent.prereqs.type === 'or' && parent.prereqs.values.length > 1) {
			return true;
		}
	}

	return false;
};

TreeMgr.prototype.savePrereqsForThisGraph = function (tree) {

	tree.prereqsForThisGraph = tree.prereqs

	tree.prereqs.values.forEach(function (subTree) {
		this.savePrereqsForThisGraph(subTree);
	}.bind(this));
};




// TREE inverients
// This function can be skipped in prod somehow
// invarients that are not checked yet:
// no duplicates in children or parents (except coreqs)
// panels should have text in them 
// should never be selected and wouldSatisfyOtherNodes
TreeMgr.prototype.ensureInvariants = function (tree, foundRootNode) {
	if (foundRootNode === undefined) {
		foundRootNode = false;
	}

	// nodes are in parents children
	// nodes are in childrens parents
	var children = tree.prereqs.values.concat(tree.coreqs.values);
	children.forEach(function (subTree) {
		if (!_(subTree.allParents).includes(tree)) {
			elog('childrens parent dosent include this tree')
		}
	}.bind(this))

	tree.allParents.forEach(function (parent) {
		var siblings = parent.prereqs.values.concat(parent.coreqs.values)
		if (!_(siblings).includes(tree)) {
			elog('parent\'s children dosent include this tree')
		}
	}.bind(this))

	// !classes have (>1 child or >1 parent) and at lest 1 child and at least 1 parent
	if (!tree.isClass) {
		if (tree.prereqs.values.length < 1) {
			elog('!Class must have at least 1 child')
		}
		if (tree.allParents.length < 1) {
			elog('!Class must have at least 1 parent')
		}
		if (tree.allParents.length === 1 && tree.prereqs.values.length === 1) {
			elog('!Class must have either more than 1 parent or more than 1 child')
		}
	}

	// no depth > 50
	if (tree.depth > 50) {
		elog('depth too large to be valid...')
	}

	// any isCoreq should only have exacly one parent
	if (tree.isCoreq && tree.allParents.length != 1) {
		elog('Coreq has more than one parent?')
	}

	// all classes data status is loaded
	if (tree.isClass && !tree.isString && tree.dataStatus != macros.DATASTATUS_DONE) {
		elog('found tree that isnt loaded?')
	}

	// only 1 node with 0 parents
	if (tree.allParents.length === 0) {
		if (foundRootNode) {
			elog('multiple nodes with no parents?')
		}
		foundRootNode = true;
	}

	if (tree.isString) {
		if (tree.coreqs.values.length != 0 || tree.prereqs.values.length != 0) {
			elog('string cant have prereqs or coreqs')
		}
		if (!tree.isClass) {
			elog('string must be class')
		}
	}

	tree.prereqs.values.forEach(function (subTree) {
		this.ensureInvariants(subTree, foundRootNode);
	}.bind(this));

	tree.coreqs.values.forEach(function (subTree) {
		this.ensureInvariants(subTree, foundRootNode);
	}.bind(this));
};



// http://localhost/#/graph/swarthmore.edu/201604/MATH/043
TreeMgr.prototype.go = function (tree) {

	this.resetTree(tree);

	// flatten coreqs and remove coreqs coreqs
	this.flattenCoreqs(tree);

	// Any fn before this one needs to be able to handle coreq -> coreq-> coreq
	this.removeCoreqsCoreqs(tree);

	this.removeAllParents(tree);


	//at this point, there should not be any with data status = not started, so if find any remove them
	//actually, dont do this because somtimes classes can error
	// this.removeInvalidSubTrees(tree);
	this.groupByHonors(tree);


	// all remaining trees a valid, so add _ids to nodes that !classes and don't already have _ids
	this.addIdsToTrees(tree);

	// SImplifyTree requires _id's but simplifyIfSelected changes what the _ids whould be generated to so have to update them again
	this.simplifyTree(tree)
	this.simplifyIfSelected(tree);

	this.sortTree(tree);

	this.addAllParentRelations(tree);

	this.skipNodesPostStuff(tree);
	// this.skipNodesPostStuff(tree);

	this.ensureInvariants(tree);
	// all remaining trees a valid, so add _ids to nodes that !classes and don't already have _ids
	this.addIdsToTrees(tree);


	this.defaultTo(tree, 'and');

	this.ensureInvariants(tree);

	this.mergeDuplicateClasses(tree)

	this.groupByCommonPrereqs(tree, 'or')
	this.groupByCommonPrereqs(tree, 'and')

	this.skipNodesPostStuff(tree);
	// this.skipNodesPostStuff(tree);

	this.ensureInvariants(tree);

	this.defaultTo(tree, 'and');

	this.removeDepth(tree);
	this.addDepthLevel(tree);

	this.addLowestParent(tree);

	this.calculateIfChildrenAtSameDepth(tree);
	this.setWouldSatisfy(tree);

	this.savePrereqsForThisGraph(tree);

	this.ensureInvariants(tree);
}

TreeMgr.prototype.TreeMgr = TreeMgr;
module.exports = new TreeMgr();
