'use strict';
var BaseSelector = require('./BaseSelector').BaseSelector;
var termInstance = require('./term')

function College () {
	BaseSelector.prototype.constructor.apply(this,arguments);

	this.element = $(".selectCollege");
	this.class ='collegeSelectContainer';
	this.next = termInstance;
	this.helpText = 'Select Your College!'
}


//prototype constructor
College.prototype = Object.create(BaseSelector.prototype);
College.prototype.constructor = College;

College.prototype.getRequestBody = function() {
	return {
		type:'POST',
		url:'/listColleges',
		body:{}
	}
};
College.prototype.processValues = function(values) {

	var retVal = [];
	values.forEach(function (college) {
		retVal.push({
			id:college.host,
			text:college.title
		});
	}.bind(this));

	retVal.sort(function(a, b){
		if(a.text < b.text) return -1;
		if(a.text > b.text) return 1;
		return 0;
	}.bind(this))
	return retVal;
};



College.prototype.College=College;
module.exports = new College();


