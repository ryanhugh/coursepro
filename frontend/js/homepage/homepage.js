'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var search = require('../search/search')
var user = require('../data/user')
var macros = require('../macros')
var Term = require('../data/Term')

function Homepage() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.user = user;

	this.searchText = ''

	this.showSearch = false;

	// this.placeholderText = 'Search for...'

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

Homepage.prototype.getPlaceholderText = function () {
	return this.placeholderText
};

Homepage.prototype.onUserUpdate = function () {
	// setTimeout(function () {

		var host = user.getValue(macros.LAST_SELECTED_COLLEGE)
		var termId = user.getValue(macros.LAST_SELECTED_TERM)

		if (host && termId) {

			var term = Term.create({
				host: host,
				termId: termId
			})

			term.download(function (err, term) {
				if (err) {
					return;
				}

				if (term.searchHints) {
					this.placeholderText = 'Search "' + term.searchHints[Math.floor(Math.random()*term.searchHints.length)] + '" ...'
				}
				else {
					this.placeholderText = 'Search for...'
				}

				setTimeout(function () {
					this.$scope.$apply()
				}.bind(this), 0)
			}.bind(this))
		}

		// this.$scope.$apply()
	// }.bind(this), 0)
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
