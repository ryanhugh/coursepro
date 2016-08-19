'use strict';

var macros = require('../macros')
var queue = require('d3-queue').queue
var _ = require('lodash')



// This class holds a branch in the prerequisite or corequisite graph. For instance, if 
// a clas's prereqs are ((a or b) and (c or d)), then 



function RequisiteBranch(data) {

	if (data.type !== 'and' && data.type !== 'or') {
		elog('invalid branch type')
	}

	if (!data.values || !Array.isArray(data.values)) {
		elog('invalid values for req branch')
	}

	var values = data.values.slice(0).sort(function (a, b) {
		return a.compareTo(b);
	}.bind(this))


	this.prereqs = {
		type: data.type,
		values: values
	}


	this.coreqs = {
		type: 'or',
		values: []
	}
}


RequisiteBranch.prototype.compareTo = function (other) {
	if (!(other instanceof RequisiteBranch)) {
		return -1;
	}
	else if (other.prereqs.values.length < this.prereqs.values.length) {
		return -1;
	}
	else if (other.prereqs.values.length > this.prereqs.values.length) {
		return 1;
	}
	else if (other.prereqs.values.length === 0 && this.prereqs.values.length === 0) {
		return 0
	}

	for (var i = 0; i < this.prereqs.values.length; i++) {
		var retVal = other.prereqs.values[i].compareTo(this.prereqs.values[i]);
		if (retVal !== 0) {
			return retVal
		}
	}


	elog('compareTo in RequisiteBranch needs more code', this, other)
};

// These two fns are copied from class.js, need to be abstracted away
RequisiteBranch.prototype.getPrereqsString = function () {
	var retVal = [];
	this.prereqs.values.forEach(function (childBranch) {
		if (!(childBranch instanceof RequisiteBranch)) {
			if (childBranch.isString) {
				retVal.push(childBranch.desc)
			}
			else if (childBranch.dataStatus !== macros.DATASTATUS_DONE) {
				elog(childBranch)
				retVal.push('some ' + childBranch.subject + ' class')
			}
			else {
				retVal.push(childBranch.subject + ' ' + childBranch.classId)
			}
		}
		else if (childBranch.prereqs.values.length === 1) {
			retVal.push(childBranch.getPrereqsString())
		}
		else {
			retVal.push('(' + childBranch.getPrereqsString() + ')')
		}
	}.bind(this))

	// Dedupe retVal
	// If two classes have the same classId (eg. CS 2500 and CS 2500 (hon))
	// remove one of them
	retVal = _.uniq(retVal);

	if (retVal.length === 0) {
		return 'None'
	}
	else {
		retVal = retVal.join(' ' + this.prereqs.type + ' ')

		return retVal;
	}
};



// Downloads the first layer of prereqs
RequisiteBranch.prototype.downloadPrereqs = function (callback) {
	var q = queue()
	this.prereqs.values.forEach(function (childBranch) {
		if (childBranch instanceof RequisiteBranch) {
			q.defer(function (callback) {
				childBranch.downloadPrereqs(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this))
		}
		else if (!childBranch.isString) {
			q.defer(function (callback) {
				childBranch.download(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this))
		}
	}.bind(this))

	q.awaitAll(function (err) {
		callback(err)
	}.bind(this))
};




RequisiteBranch.prototype.RequisiteBranch = RequisiteBranch;
module.exports = RequisiteBranch;
