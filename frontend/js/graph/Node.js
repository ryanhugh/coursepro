'use strict';

var _ = require('lodash')
var macros = require('../macros')
var Class = require('../data/Class')

function Node(classOrRequisiteBranch) {
	if (classOrRequisiteBranch.isClass === false) {
		elog()
	}

	if (classOrRequisiteBranch instanceof Class) {
		this.isClass = true;
	}
	else {
		this.isClass = false;
	}


	this.class = classOrRequisiteBranch;


	// graph links, both up and down
	this.upwardLinks = []
	this.downwardLinks = []

	this.allParents = []


	// Determined in tree mgr to avoid having to calculate every tick
	this.allChildrenAtSameDepth = true;

	//copied from the class instance on creation
	this.prereqs = {
		type: 'or',
		values: []
	}


	this.coreqs = {
		type: 'or',
		values: []
	}

	// Pointer to the angular scope
	this.$scope = null;

	this.foreignObject = null;

	// Timeout that is started when you hover over a panel that fires after some time
	// controlled by graphPanelExpand
	// when it fires the panel is opened
	this.graphPanelPromptTimeout = 0;


	// Added by TreeMgr, it is how far this node is away from the root node.
	// if this value is 0, this node is the root node. 
	// Only prereqs have a depth level, coreqs do not. 
	this.depth = 0;

	// Used by the panel for whether the panel is expanded or not. 
	this.isExpanded = false;
	this.showSelectPanel = false;

	// Default number of sections to show at at time
	this.showingSectionCount = 10;

	// Added by treeMgr to keep track of weather this node should be light blue or dark blue
	this.wouldSatisfyNode = false;

	// Added by treeMgr to determine weather this node should be linked to by other panels or should just follow a non coreq node around
	this.isCoreq = false;
	// Added by treemgr, is the index of this node in the paren't .coreqs.values, if this node is a coreq
	this.coreqIndex = 0;


	// For D3
	// X and Y are set to undefined to start.
	// When they are undefined, graph.js will estimate their position based on other nearby nodes. 
	this.x;
	this.y;
	this.height = 0;
	this.width = 0;

	// Used by D3 internally, never touched externally
	this.weight = 0;
}

// Creates a class, but dosen't copy over prereqs. Used for the first layer of coreqs so it dosen't recurse any more
Node.createShallow = function (aClass) {
	if (!aClass) {
		elog('need class for node')
		return null;
	}

	return new this(aClass);
}


Node.create = function (aClass) {
	if (!aClass) {
		elog('need class for node')
		return null;
	}

	var instance = new this(aClass);

	// Create new nodes for the prereqs too
	instance.prereqs.type = aClass.prereqs.type
	aClass.prereqs.values.forEach(function (child) {
		instance.prereqs.values.push(instance.constructor.create(child));
	}.bind(this))


	// And the coreqs
	instance.coreqs.type = aClass.coreqs.type
	aClass.coreqs.values.forEach(function (child) {
		instance.coreqs.values.push(instance.constructor.createShallow(child));
	}.bind(this))

	return instance;
};


// its better to return a random number than to return null in case of error
Node.prototype.getId = function () {
	if (this.isClass) {
		if (this.class._id) {
			return this.class._id;
		}
		else if (this.class.isString) {
			return this.class.host + this.class.termId + this.class.desc
		}
		else if (this.class.dataStatus === macros.DATASTATUS_FAIL) {
			var id = this.class.host + this.class.termId + this.class.subject;
			if (this.class.classUid) {
				return id + this.class.classUid
			}
			else if (this.class.classId) {
				return id + this.classId
			}
			else {
				elog('?')
				return id + Math.random();
			}
		}
		else {
			elog('class dosent have id?')
			return String(Math.random());
		}
	}
	else {

		if (this.prereqs.values.length < 2) {
			elog('not enough prereqs to generate _id from!')
			return String(Math.random());
		}

		this.prereqs.values.sort(function (a, b) {
			return a.compareTo(b);
		}.bind(this))

		var ids = [];
		this.prereqs.values.forEach(function (child) {
			ids.push(child.getId())
		}.bind(this))
		if (ids.length === 0) {
			elog('cannot make id!', this)
			return String(Math.random());
		}
		var id = ids.join('')
		if (id.length < 3) {
			elog('couldnt make an id!', this._id, this);
			return String(Math.random());
		}
		return id
	}
};


// WARNING: Will return a node that is the same as the existing one,
// and parents and children pointers will point to the same nodes,
// but this node will not be in the .prereqs.values, .coreqs.values, or allParents of any nearby nodes
// use carefully
// When this was written the only use was for cloning coreqs that could appear on the screen at the same time
Node.prototype.clone = function () {
	if (!this.isCoreq) {
		// No need to do this yet, could enable it in the future
		elog('cant clone !isCoreq yet')
	}

	if (!this.isClass) {
		// Could enable in future
		elog('cant clone !isClass ?')
	}

	var other = this.constructor.create(this.class);

	for (var attrName in this) {
		if (this[attrName] instanceof HTMLElement) {
			elog('cant clone a HTMLElement in node clone', this[attrName])
			continue;
		}
		else if ((typeof this[attrName]) === 'function') {
			continue;
		}
		else if (Array.isArray(this[attrName])) {
			var canClone = true;
			for (var i = 0; i < this[attrName].length; i++) {
				if (this[attrName] instanceof HTMLElement) {
					canClone = false;
					break;
				}
			}
			if (canClone) {
				other[attrName] = _.cloneDeep(this[attrName])
			}
			else {
				elog('cant clone a HTMLElement in node clone', this[attrName])
				other[attrName] = this[attrName]
			}
		}
		else {
			other[attrName] = this[attrName]

		}
	}
	return other;
};


Node.prototype.compareTo = function (other) {
	if (this.isClass && other.isClass) {
		return this.class.compareTo(other.class);
	}
	if (this.isClass && !other.isClass) {
		return -1;
	}
	else if (!this.isClass && other.isClass) {
		return 1;
	}
	if (this.prereqs.values.length > other.prereqs.values.length) {
		return -1
	}
	else if (this.prereqs.values.length < other.prereqs.values.length) {
		return 1;
	}
	else {
		// More could be added here, but I don't think is is ever called
		elog("need more sorting on node compareTo", this, other);
		return 0;
	}
};


Node.prototype.getParentString = function () {

	var currNode = this.lowestParent;

	while (currNode) {
		if (currNode.isClass) {
			return currNode.class.subject + ' ' + currNode.class.classId
		}
		currNode = currNode.lowestParent;
	}

	return null;
}


// change z index of a node
Node.prototype.bringToFront = function () {

	// find the g element that is a parent of the foreignObject, and move it to the end of its children
	// in svgs this is how zindex works
	var g = this.foreignObject.parentElement;
	var gParentElement = g.parentElement;
	g.remove();
	gParentElement.appendChild(g)
};

Node.prototype.sortCoreqs = function () {
	if (this.coreqs.values.length == 0) {
		return;
	}

	for (var i = this.coreqs.values.length - 1; i >= 0; i--) {
		this.coreqs.values[i].bringToFront();
	}
	this.bringToFront();
};



Node.prototype.updatePos = function () {

	if (!this.foreignObject || !this.foreignObject.parentElement) {
		elog()
		return;
	}

	var value;
	if (this.isCoreq) {

		var x = this.lowestParent.x - this.width / 2;
		var y = this.lowestParent.y - this.height / 2;

		x += (this.coreqIndex + 1) * 30
		y -= (this.coreqIndex + 1) * 39

		value = "translate(" + x + "," + y + ")";
	}
	else {
		value = "translate(" + (this.x - this.width / 2) + "," + (this.y - this.height / 2) + ")";
	}

	this.foreignObject.parentElement.setAttribute('transform', value);
};

Node.prototype.getWidth = function () {
	if (this.showSelectPanel) {
		return macros.SELECT_PANEL_WIDTH;
	}
	else if (!this.isExpanded) {
		return macros.NODE_WIDTH;
	}
	else if (this.class.sections.length > 0) {
		return macros.NODE_EXPANDED_MAX_WIDTH;
	}
	else {
		return Math.max(macros.NODE_EXPANDED_MIN_WIDTH, Math.min(macros.NODE_EXPANDED_MAX_WIDTH, this.class.desc.length))
	}
};

Node.prototype.updateWidth = function () {
	this.width = this.getWidth();
	this.foreignObject.setAttribute('width', this.width);
	this.updatePos();
};


Node.prototype.updateHeight = function () {

	if (!this.foreignObject || !this.foreignObject.parentNode) {
		elog()
		return;
	}

	// update the height of the panel
	this.height = this.foreignObject.lastChild.offsetHeight

	//update the foreign object and the g with the new height
	this.foreignObject.setAttribute('height', this.height)
	this.foreignObject.parentNode.setAttribute('height', this.height)
	this.updatePos();
};


Node.prototype.checkPos = function () {
	if (this.x === undefined || isNaN(this.x) || isNaN(this.y) || this.y === undefined) {
		elog('invalid x or y!', this)
	}
}



module.exports = Node;
