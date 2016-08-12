'use strict';

var macros = require('../macros')



// This class holds a branch in the prerequisite or corequisite graph. For instance, if 
// a clas's prereqs are ((a or b) and (c or d)), then 



function RequisiteBranch(data) {
	
	if (data.type !== 'and' && data.type !== 'or') {
		elog('invalid branch type')
	}
	
	if (!data.values || !Array.isArray(data.values)) {
	 	elog('invalid values for req branch')
	}
	

	this.prereqs = {
		type: data.type,
		values: data.values.slice(0)
	}


	this.coreqs = {
		type: 'or',
		values: []
	}
	
}



RequisiteBranch.prototype.RequisiteBranch = RequisiteBranch;
module.exports = RequisiteBranch;