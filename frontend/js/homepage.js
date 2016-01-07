'use strict';
var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')
var emailMgr = require('./emailMgr')

function Homepage($scope) {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.email = '';
	this.emailMsg = ''
}

Homepage.url = '/'
Homepage.isPage = true

//prototype constructor
Homepage.prototype = Object.create(BaseDirective.prototype);
Homepage.prototype.constructor = Homepage;

Homepage.prototype.subscribe = function (email) {
	emailMgr.subscribe(this.email, function (errMsg, successMsg) {
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
directiveMgr.addDirective(Homepage)