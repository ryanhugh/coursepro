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




		this.renderedClasses = []
		this.unrenderedClasses = []

		// return;
		var i;
		//render 20 to start, infinate scroll more
		for (var i = 0; i < 20; i++) {
			this.renderedClasses.push(this.$scope.classes[i]);
		}

		//put the rest in unrendered classes, and move then when need to
		this.unrenderedClasses = this.$scope.classes.slice(i)


		// this.$scope.loadMore = function () {
		// 	// debugger
		// 	console.log("load more called");
		// }.bind(this)

		// this.$scope.images = [1, 2, 3, 4, 5, 6, 7, 8];

		this.$scope.loadMore = function () {
			var more = this.unrenderedClasses.shift()

			if (more) {
				this.renderedClasses.push(more)

			};

			return;
			var last = this.$scope.images[this.$scope.images.length - 1];
			for (var i = 1; i <= 8; i++) {
				this.$scope.images.push(last + i);
			}
		}.bind(this);



	}.bind(this))


}

ClassList.scope = {
	classes: '='
}

ClassList.fnName = 'ClassList'
ClassList.$inject = ['$scope', '$timeout', '$attrs']

ClassList.prototype.onClick = function (aClass, subScope) {
	aClass.loadSections(function (err) {
		if (err) {
			elog(err);
		}

		setTimeout(function () {
			subScope.$apply();
		}.bind(this), 0)

	}.bind(this))

	//don't submit if just closed accordian
	if (!subScope.isOpen) {
		return;
	};

	ga('send', {
		'hitType': 'pageview',
		'page': '/listSections/' + aClass.getIdentifer().full.str,
		'title': 'Coursepro.io'
	});


};


ClassList.prototype.getLoadingHidden = function () {
	var activeRequests = user.activeRequestCount;
	var timeDiff = new Date().getTime() - user.lastRequestTime;

	if (activeRequests <= 0) {

		//recalculate 100 ms after last update
		if (timeDiff < 100) {
			this.$timeout(function () {}, 100 - timeDiff)
			return false;
		}
		else if (timeDiff < 5000) {
			this.$timeout(function () {}, 5000 - timeDiff)
			return true;
		}
		else {
			return false;
		}
	}
	else {

		//recalculate 100 ms after last update
		if (timeDiff < 100) {
			this.$timeout(function () {}, 100 - timeDiff)
			return false;
		}
		else {
			return true;
		}
	}
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



// ClassList.link = function (scope, element, attrs) {
// 	debugger
// 	if (!attrs.classes) {
// 		elog("ERROR class list not given classes on attr",scope,element,attrs);
// 	}

// 	scope.classes = attrs.classes;
// };




ClassList.prototype.ClassList = ClassList;
module.exports = ClassList;
directiveMgr.addDirective(ClassList)
