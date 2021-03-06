/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

'use strict';
var _ = require('lodash')

var macros = require('../macros')
var Class = require('../data/Class')
var user = require('../data/user')

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

	// Keeps track of wheather is class is required for any classes above. 
	// When there is only 1 parent, it will be !== wouldSatisfyNode, but 
	this.isRequired = false;

	// Added by treeMgr to determine weather this node should be linked to by other panels or should just follow a non coreq node around
	this.isCoreq = false;
	// Added by treemgr, is the index of this node in the paren't .coreqs.values, if this node is a coreq
	this.coreqIndex = 0;

	// Interval used to keep track of the status of the "changes saved" animation.
	// Code for this is in graphPanelExpand. 
	this.changesSavedInterval = null;



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


// When the panel is expanded, it shouldn't move at all
// Set node.fixed to true when the panel is expanded and to false when it is closed
// Instead of having two booleans that are allways the same state,
// use defineProperty to ensure fixed is allways the same as isExpanded
Object.defineProperty(Node.prototype, 'fixed', {
	get: function () {
		return this.isExpanded
	},
	set: function (value) {
		this.isExpanded = value
	}
})


// its better to return a random number than to return null in case of error
Node.prototype.getIdInternal = function () {
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

Node.prototype.getId = function () {
	if (!this._id) {
		this._id = this.getIdInternal()
	}
	return this._id;
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

		for (var i = 0; i < this.prereqs.values.length; i++) {
			var retVal = other.prereqs.values[i].compareTo(this.prereqs.values[i]);
			if (retVal !== 0) {
				return retVal
			}
		}

		// More could be added here, but I don't think is is ever called
		elog("need more sorting on node compareTo", this, other);
		return 0;
	}
};

// Gets a list of parents that would be satisfied if this class is selected
// If this node has parents that are classes and have type of 'or' prereqs, just show them
// If not, and it would satisfy a requisiteBranch, show the class above the requisite branch
Node.prototype.getParentString = function () {

	if (user.getListIncludesClass(macros.SELECTED_LIST, this.class) && this.allParents.length > 1) {
		return 'above classes'
	}

	var stack = this.allParents.slice(0);
	var retVal = []
	var andParents = []
	var curr;

	while ((curr = stack.pop())) {

		if (!curr.isClass) {
			stack = stack.concat(curr.allParents)
			continue;
		}

		var classSubjectandId = curr.class.subject + ' ' + curr.class.classId

		if (curr.prereqs.type === 'and') {
			if (!_(andParents).includes(classSubjectandId)) {
				andParents.push(classSubjectandId)
			}
		}
		else if (curr.prereqs.type === 'or') {
			if (!_(retVal).includes(classSubjectandId)) {
				retVal.push(classSubjectandId)
			}
		}
	}

	if (retVal.length > 0) {
		return retVal.join(' and ')
	}
	else if (andParents.length > 0) {
		return andParents.join(' and ')
	}
	else {
		return null
	}
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
		if (this.class.desc) {
			return Math.max(macros.NODE_EXPANDED_MIN_WIDTH, Math.min(macros.NODE_EXPANDED_MAX_WIDTH, this.class.desc.length))
		}
		else {
			return macros.NODE_EXPANDED_MIN_WIDTH
		}
	}
};

Node.prototype.updateWidth = function () {
	this.width = this.getWidth();
	var addition = 0
	if (macros.FIREFOX) {
		addition = 10
	}
	this.foreignObject.setAttribute('width', this.width + addition);
	this.updatePos();
};


Node.prototype.updateHeight = function () {

	if (!this.foreignObject || !this.foreignObject.parentNode) {
		elog()
		return;
	}

	// update the height of the panel
	this.height = this.foreignObject.lastChild.offsetHeight
	
	var addition = 0
	if (macros.FIREFOX) {
		addition = 10
	}

	//update the foreign object and the g with the new height
	this.foreignObject.setAttribute('height', this.height + addition)
	this.foreignObject.parentNode.setAttribute('height', this.height + addition)
	this.updatePos();
};


Node.prototype.checkPos = function () {
	if (this.x === undefined || isNaN(this.x) || isNaN(this.y) || this.y === undefined) {
		elog('invalid x or y!', this)
	}
}


// Starts a timer for a given number of ms.
// The timer is canceled if this node's $scope is destroyed before the timer is fired
// Use when starting timers that depend on the existace of this node when they are fired. 
Node.prototype.timeout = function (fn, ms) {
	if (ms === undefined) {
		ms = 0;
	}
	var timer = setTimeout(function () {
		if (this.$scope.$$destroyed) {
			console.log("wtf, scope was destroyed");
			return;
		}
		fn()
	}.bind(this), ms)


	this.$scope.$on('$destroy', function () {
		clearTimeout(timer);
	}.bind(this))
};



// Returns true if the given node is a direct prereq, or a prereq of any prereq (grandchild prereq)
Node.prototype.containsClassAsPrereq = function (node) {
	var contains = false;
	// var nodeId = node.getId()

	for (var i = 0; i < this.prereqs.values.length; i++) {
		var child = this.prereqs.values[i]
		if (child === node) {
			return true;
		}
	}

	for (var i = 0; i < this.prereqs.values.length; i++) {
		var child = this.prereqs.values[i]
		if (child.containsClassAsPrereq(node)) {
			return true;
		}
	}

	return false;
};




module.exports = Node;
