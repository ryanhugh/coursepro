'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


var request = require('../request')


function Search($scope, $location) {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.searchText = ''

	this.isExpanded = false;
}


Search.prototype.searchFromEntry = function () {
	var host = selectorsMgr.college.getValue();
	if (!host) {
		console.log('error: need to select college first');
		return
	}

	var termId = selectorsMgr.term.getValue();
	if (!termId) {
		console.log('error: need to select term first');
		return;
	}

	var subject = selectorsMgr.subject.getValue();
	if (!subject) {
		console.log('error: need to select subject first');
		return;
	};

	if (!this.searchText) {
		console.log('error: empty box')
		return;
	};

	this.$location.path('/search/' + encodeURIComponent(host) + '/' + encodeURIComponent(termId) + '/' + encodeURIComponent(subject) + '/' + encodeURIComponent(this.searchText))
};



Search.prototype.Search = Search;
module.exports = Search;
directiveMgr.addDirective(Search)