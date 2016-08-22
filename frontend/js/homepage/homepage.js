'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var search = require('../search/search')
var user = require('../data/user')
var macros = require('../macros')

function Homepage() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.user = user;

	this.searchText = ''

	this.showSearch = false;

	user.onAuthFinish(this.constructor.fnName, this.onUserUpdate.bind(this))

	setTimeout(function () {
		var searchBox = document.getElementById('homepageSearchInputId');
		if (searchBox) {
			searchBox.focus()
		}
	}.bind(this), 0)

}

Homepage.fnName = 'Homepage'
Homepage.$inject = ['$scope']
Homepage.urls = ['/']
Homepage.isPage = true

//prototype constructor
Homepage.prototype = Object.create(BaseDirective.prototype);
Homepage.prototype.constructor = Homepage;

Homepage.prototype.getHost = function() {
	return user.getValue(macros.LAST_SELECTED_TERM);
};


Homepage.prototype.onUserUpdate = function () {
	setTimeout(function () {
		this.$scope.$apply()
	}.bind(this), 0)
};


Homepage.prototype.focusSearch = function () {
	search.searchText = this.searchText;
	this.showSearch = true;
	this.searchText = ''

	setTimeout(function () {
		search.focusSearchBox()
	}.bind(this), 0)
};

Homepage.prototype.Homepage = Homepage;
module.exports = Homepage;
directiveMgr.addController(Homepage)
