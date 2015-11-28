'use strict';
var BaseSelector = require('./BaseSelector').BaseSelector;
var classInstance = require('./class')


function Subject () {
	BaseSelector.prototype.constructor.apply(this,arguments);

	this.element = $(".selectSubject")
	this.class ='subjectSelectContainer'
	this.next = classInstance;
	this.helpText = 'Select Subject!'
}


//prototype constructor
Subject.prototype = Object.create(BaseSelector.prototype);
Subject.prototype.constructor = Subject;


Subject.prototype.getRequestBody = function() {
	return {
		url:'/listSubjects',
		type:'POST',
		body:{
			host:selectorsMgr.college.getValue(),
			termId:selectorsMgr.term.getValue()
		}
	}
};

Subject.prototype.processValues = function(values) {
	
	var retVal = [];
	values.forEach(function (item) {
		if (!item.subject || !item.text) {
			return;
		}

		retVal.push({
			text:item.subject+' - '+item.text,
			id:item.subject
		})
	}.bind(this))

	retVal.sort(function(a, b){
		if(a.id < b.id) return -1;
		if(a.id > b.id) return 1;
		return 0;
	}.bind(this))
	return retVal;
}



Subject.prototype.Subject=Subject;
module.exports = new Subject();



