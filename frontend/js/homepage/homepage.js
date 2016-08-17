'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var search = require('../search/search')
var user = require('../data/user')

function Homepage() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.user = user;


	this.searchText = ''

	this.showSearch = false;

}

Homepage.fnName = 'Homepage'
Homepage.$inject = ['$scope']
Homepage.urls = ['/']
Homepage.isPage = true

//prototype constructor
Homepage.prototype = Object.create(BaseDirective.prototype);
Homepage.prototype.constructor = Homepage;


Homepage.prototype.focusSearch = function(event) {
	console.log(event);
	search.searchText= this.searchText;
	this.showSearch = true;

	setTimeout(function () {
		search.focusSearchBox()
	}.bind(this),0)


};

Homepage.prototype.Homepage = Homepage;
module.exports = Homepage;
directiveMgr.addController(Homepage) 