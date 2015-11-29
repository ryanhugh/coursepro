'use strict';
var BaseSelector = require('./baseSelector').BaseSelector;

var subjectInstance = require('./subject')

function Term () {
	BaseSelector.prototype.constructor.apply(this,arguments);
	this.element= $(".selectTerm");
	this.class='termSelectContainer';
	this.next = subjectInstance;
	this.helpText = 'Select Term!'
}


//prototype constructor
Term.prototype = Object.create(BaseSelector.prototype);
Term.prototype.constructor = Term;

Term.prototype.getRequestBody = function() {
	return {
		url:'/listTerms',
		type:'POST',
		body:{
			host:selectorsMgr.college.getValue()
		}
	}
};

Term.prototype.processValues = function(values) {

	var retVal = [];
	values.forEach(function (item) {
		retVal.push({
			text:item.text,
			id:item.termId
		})
	}.bind(this))

	retVal.sort(function(a, b){
		if(a.id > b.id) return -1;
		if(a.id < b.id) return 1;
		return 0;
	}.bind(this))
	return retVal;
};


Term.prototype.Term=Term;
module.exports = new Term();

