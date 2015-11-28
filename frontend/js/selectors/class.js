'use strict';
var BaseSelector = require('./baseSelector').BaseSelector;

function Class () {
	
	BaseSelector.prototype.constructor.apply(this,arguments);

	this.class='classSelectContainer'
	this.element=$(".selectClass")
	this.helpText = 'Select Class!'
}


//prototype constructor
Class.prototype = Object.create(BaseSelector.prototype);
Class.prototype.constructor = Class;


Class.prototype.getRequestBody = function() {
	return {
		url:'/listClasses',
		type:'POST',
		body:{
			host:selectorsMgr.college.getValue(),
			termId:selectorsMgr.term.getValue(),
			subject:selectorsMgr.subject.getValue()
		}
	}
};

//convert the server data to the input format select2 needs
Class.prototype.processValues = function(values) {
	
	var retVal = [];
	values.forEach(function (item) {
		if (!item.classId || !item.name) {
			return;
		};
		retVal.push({
			text:item.classId+' - '+item.name,
			id:item.classId
		})
	}.bind(this))

	retVal.sort(function(a, b){
		if(a.id < b.id) return -1;
		if(a.id > b.id) return 1;
		return 0;
	}.bind(this))
	return retVal;
};



Class.prototype.Class=Class;
module.exports =new Class();
