'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')

function ClassList() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.$scope.user = user;

	this.$scope.$watch('classes', function () {

		if (!this.$scope.classes) {
			return;
		};

		//prefetch if there arnt many classes
		if (this.$scope.classes.length < 10) {
			this.$scope.classes.forEach(function (aClass) {
				aClass.loadSections()
			}.bind(this))
		};
	}.bind(this))
}

ClassList.$inject = ['$scope', '$timeout']



ClassList.prototype.getLoadingHidden = function () {
	var activeRequests = user.activeRequestCount;
	var timeDiff = new Date().getTime() - user.lastRequestTime;

	var retVal;

	if (activeRequests <= 0) {

		//recalculate 100 ms after last update
		if (timeDiff < 100) {
			this.$timeout(function () {}, 100 - timeDiff)
			retVal = false;
		}
		else if (timeDiff < 5000) {
			this.$timeout(function () {}, 5000 - timeDiff)
			retVal = true;
		}
		else {
			retVal = false;
		}
	}
	else {

		//recalculate 100 ms after last update
		if (timeDiff < 100) {
			this.$timeout(function () {}, 100 - timeDiff)
			retVal = false;
		}
		else {
			retVal = true;
		}
	}
	// console.log("returning:", retVal, timeDiff, user.lastRequestTime);
	return retVal;
};


//show loading if has been loading for 100ms
//this dosent work if another request is fired (which resets user.lastRequestTime)
//or if two separate requests were running 100ms apart
//...but is good enough for now
ClassList.prototype.showLoadingText = function () {
	var timeDiff = new Date().getTime() - user.lastRequestTime;
	if (user.activeRequestCount > 0 && timeDiff > 100) {
		return true;
	}
	else {
		return false;
	}
};



ClassList.prototype.ClassList = ClassList;
module.exports = ClassList;
directiveMgr.addDirective(ClassList)
