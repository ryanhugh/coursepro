'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var user = require('../data/user')

function Homepage() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.email = '';
	this.emailMsg = ''
}

Homepage.fnName = 'Homepage'
Homepage.$inject = ['$scope']
Homepage.urls = ['/']
Homepage.isPage = true

//prototype constructor
Homepage.prototype = Object.create(BaseDirective.prototype);
Homepage.prototype.constructor = Homepage;

Homepage.prototype.subscribe = function (email) {
	user.subscribeForNews(this.email, function (errMsg, successMsg) {
		if (errMsg) {
			this.emailMsg = errMsg
		}
		else {
			this.emailMsg = successMsg
		}
		this.$scope.$apply()
	}.bind(this))
};


Homepage.prototype.openSelectors = function () {
	selectorsMgr.go()
};


Homepage.prototype.Homepage = Homepage;
module.exports = Homepage;
directiveMgr.addController(Homepage)