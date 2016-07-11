'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')
var Help = require('../help/help')

function NavBar() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.user = user;


	


}

NavBar.fnName = 'NavBar'
NavBar.$inject = ['$scope','$uibModal']

NavBar.prototype.getHost = function() {
	return user.getValue('lastSelectedCollege')
}
NavBar.prototype.getTerm = function() {
	return user.getValue('lastSelectedTerm');
};

NavBar.prototype.openHelp = function() {
	Help.open(this)
};

NavBar.prototype.openSelectors = function() {
	selectorsMgr.go()
};


NavBar.prototype.NavBar = NavBar;
module.exports = NavBar;
directiveMgr.addDirective(NavBar)