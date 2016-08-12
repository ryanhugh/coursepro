'use strict';
 
var _ = require('lodash')
var macros = require('../macros')
var Class = require('../data/Class')

function Node(classOrRequisiteBranch) {
	console.warn("the isClass check is temp");
	if (classOrRequisiteBranch instanceof Class && classOrRequisiteBranch.isClass !== false) {
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


	// Create new nodes for the prereqs too
	this.prereqs.type = classOrRequisiteBranch.prereqs.type
	classOrRequisiteBranch.prereqs.values.forEach(function (child) {
		this.prereqs.values.push(this.constructor.create(child));
	}.bind(this))



	this.coreqs = {
		type: 'or',
		values: []
	}

	// And the coreqs
	this.coreqs.type = classOrRequisiteBranch.coreqs.type
	classOrRequisiteBranch.coreqs.values.forEach(function (child) {
		this.coreqs.values.push(this.constructor.create(child));
	}.bind(this))


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
	this.x = 0;
	this.y = 0;
	this.height = 0;
	this.width = 0;

	// Used by D3 internally, never touched externally
	this.weight = 0;

	// After getId is ran once, the value is stored here so the fn dosen't have to run again
	// this._id = null;
	// if (this.class) {
	// 	this._id = this.class._id;
	// }
}


Node.create = function (aClass) {
	if (!aClass) {
		elog('need class for node')
		return null;
	}
	return new this(aClass);
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
			if (this.classUid) {
				return id + this.classUid
			}
			else if (this.classId) {
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


Node.prototype.compareTo = function(other) {
	if (this.isClass && other.isClass) {
		return this.class.compareTo(other.class);
	}
	if (this.isClass && !other.isClass) {
		return -1;
	}
	else if (!this.isClass && other.isClass) {
		return 1;
	}

	console.warn('is this called??');
	if (this.prereqs.values.length > other.prereqs.values.length) {
		return -1
	}
	else if (this.prereqs.values.length < other.prereqs.values.length) {
		return 1;
	}
	else {
		elog("?")
		return 0;
	}
};



module.exports = Node;
