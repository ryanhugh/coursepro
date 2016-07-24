'use strict';
var _ = require('lodash')

var request = require('../request')
var queue = require('d3-queue').queue;
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var Class = require('../Class')


function Search() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.searchText = ''
	
	// Updated on search, used in ng-repeat
	this.classes = [];
	
	
	// stuff i need to take
	
	// host: 'neu.edu',
	// 	termId: '201710',
	// 	isClass: false,
	// 	prereqs: {
	// 		type: 'and',
	// 		values: 
	

	
	// 	}
	// }


	// this.$scope.$on('$routeChangeSuccess', function () {

	// 	if (this.$routeParams.subject) {
	// 		this.$scope.focusSelector = false;
	// 	}
	// 	else {
	// 		this.$scope.focusSelector = true;
	// 	}

	// 	//wait for a subject and a search term
	// 	if (this.$routeParams.subject && this.$routeParams.searchText) {
	// 		this.searchText = this.$routeParams.searchText
	// 		this.go()
	// 	}

	// 	setTimeout(function () {
	// 		this.$scope.$apply();
	// 	}.bind(this), 0)


	// }.bind(this))

	// this.$scope.addSubject = this.addSubject.bind(this)
	this.search()
}

Search.fnName = 'Search'
// Search.isPage = true;
Search.$inject = ['$scope']
// Search.urls = ['/search/:host/:termId/:subject?/:searchText?']

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


// NEw
Search.prototype.search = function() {
	
	// search here
	
	// class = JSON.stringify()
	
		this.classes = []
	
		var keys = [{
			subject: 'EECE',
			classUid: '2322_1420743956',
		}, {
			subject: 'EECE',
			classUid: '2323_2018952043',
		}, {
			subject: 'EECE',
			classUid: '2540_2092162332',
		}, {
			subject: 'CS',
			classUid: '4800_1303374065'
		}, {
			subject: 'CS',
			classUid: '3700_1941416797'
		}, {
			subject: 'CS',
			classUid: '4400_1871949484'
		}, {
			subject: 'CS',
			classUid: '4500_118506562'
		}, {
			subject: 'PHYS',
			classUid: '1155_521395573'
		}]
	keys.forEach(function(row) {
		row.termId = '201710'
		row.host = 'neu.edu'
	}.bind(this));
	
	
	var q = queue()
	
	keys.forEach(function(row) {
		var aClass = Class.create(row)
		q.defer(function(callback){
			aClass.download(function(err){
				callback(err)
			}.bind(this))
		}.bind(this))
		this.classes.push(aClass)
	}.bind(this))
	
	q.awaitAll(function(err){
		if (err) {
			elog(err);
			return;
		}
		
		
		
		this.$scope.$apply();
	}.bind(this))
}




Search.prototype.addSubject = function (subject) {
	this.$route.updateParams({
		subject: subject.subject
	})
};

Search.prototype.Search = Search;
module.exports = Search;
directiveMgr.addDirective(Search)
