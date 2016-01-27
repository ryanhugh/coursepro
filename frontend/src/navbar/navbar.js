'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../User')

function NavBar() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.user = user;
}

NavBar.prototype.getHost = function() {
	return user.getValue('lastSelectedCollege')
}
NavBar.prototype.getTerm = function() {
	return user.getValue('lastSelectedTerm');
};

NavBar.$inject = ['$scope']

NavBar.prototype.NavBar = NavBar;
module.exports = NavBar;
directiveMgr.addDirective(NavBar)