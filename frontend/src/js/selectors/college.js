'use strict';
var BaseSelector = require('./baseSelector').BaseSelector;

var user = require('../user')
var Host = require('../Host')

function College() {
	BaseSelector.prototype.constructor.apply(this, arguments);

	this.element = $(".selectCollege");
	this.class = 'collegeSelectContainer';
	this.next = selectorsMgr.term;
	this.helpText = 'Select Your College'
}


//prototype constructor
College.prototype = Object.create(BaseSelector.prototype);
College.prototype.constructor = College;

College.prototype.onSelect = function (value) {
	user.setValue('lastSelectedCollege', value)
};

College.prototype.download = function(callback) {
	if (!callback) {
		callback = function () {}
	}

	Host.createMany({}, function (err, colleges) {

		var retVal = [];
		colleges.forEach(function (college) {
			retVal.push({
				id: college.host,
				text: college.title
			});
		}.bind(this));

		return callback(err, retVal)
	}.bind(this))
};



module.exports = College;
