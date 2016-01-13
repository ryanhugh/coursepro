'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


var request = require('../request')


function Search($scope) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.search = this;

	this.searchText = ''

	this.isExpanded = false;
}

 
// Search.prototype.searchFromString = function (host, termId, subject, string) {
// 	if (!string) {
// 		return
// 	};
// 	this.searchText = string;
// 	this.go(host, termId, subject, string);
// };

Search.prototype.searchFromEntry = function () {
	var host = selectorsMgr.college.getValue();
	if (!host) {
		console.log('error: need to select college first');
		return
	}

	var termId = selectorsMgr.term.getValue();
	if (!termId) {
		console.log('error: need to selecte term first');
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

	this.$location.path('/search/'+host+'/'+termId+'/'+subject+'/'+this.searchText)
	// this.go(host, termId, subject, this.searchText);
};



Search.prototype.Search = Search;
module.exports = Search;
directiveMgr.addDirective(Search)