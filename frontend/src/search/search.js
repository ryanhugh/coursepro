'use strict';
var queue = require('d3-queue').queue;
var _ = require('lodash')
var async = require('async')

var request = require('../request')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var Class = require('../Class')

function Search() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.searchText = ''

	this.$scope.$on('$routeChangeSuccess', function () {

		if (this.$routeParams.subject) {
			this.$scope.focusSelector = false;
		}
		else {
			this.$scope.focusSelector = true;
		}

		//wait for a subject and a search term
		if (this.$routeParams.subject && this.$routeParams.searchText) {
			this.searchText = this.$routeParams.searchText
			this.go()
		}

		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)


	}.bind(this))

	this.$scope.addSubject = this.addSubject.bind(this)
}

Search.fnName = 'Search'
Search.isPage = true;
Search.$inject = ['$scope', '$routeParams', '$route', '$location']
Search.urls = ['/search/:host/:termId/:subject?/:searchText?']

//prototype constructor
Search.prototype = Object.create(BaseDirective.prototype);
Search.prototype.constructor = Search;

Search.prototype.go = function () {
	if (!this.$routeParams.subject || !this.$routeParams.searchText) {
		console.log("tried to run search go but don't have subject or searchText", this.$routeParams);
		return;
	};


	this.isLoading = true;

	console.log('searching for ', this.searchText)

	request({
		url: '/search',
		type: 'POST',
		body: {
			host: this.$routeParams.host,
			termId: this.$routeParams.termId,
			subject: this.$routeParams.subject,
			value: this.searchText
		}
	}, function (err, results) {
		this.isLoading = false;
		if (err) {
			elog('error in search', err)
			return;
		};


		console.log('found ', results.length, ' classes!');

		var classes = []

		results.forEach(function (classData) {
			var aClass = Class.create(classData)
			classes.push(aClass)
		}.bind(this))

		classes.sort(function (a,b) {
			return a.compareTo(b)
		}.bind(this))

		this.$scope.classes = classes;


		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)

		// // this.container.innerHTML = '<div style="font-size: 28px;text-align: center;padding-top: 200px;font-weight: 600;">Nothing Found!</div>'

	}.bind(this))
} 



Search.prototype.onEnter = function () {
	if (!this.$routeParams.subject || !this.searchText) {
		return;
	};


	this.searchText = this.searchText.trim().replace(/\s+/g, '').toLowerCase();

	var obj = this.$routeParams;

	this.$location.path('/search/' + encodeURIComponent(obj.host) + '/' + encodeURIComponent(obj.termId) + '/' + encodeURIComponent(obj.subject) + '/' + encodeURIComponent(this.searchText))
};




Search.prototype.addSubject = function (subject) {
	this.$route.updateParams({
		subject: subject.subject
	})
};

Search.prototype.Search = Search;
module.exports = Search;
directiveMgr.addDirective(Search)
