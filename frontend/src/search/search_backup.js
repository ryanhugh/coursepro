'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


var request = require('../request')


function Search() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.searchText = ''

	this.isExpanded = false;
}

Search.$inject = ['$scope', '$location']

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
};



Search.prototype.Search = Search;
module.exports = Search;
directiveMgr.addDirective(Search)