'use strict';
var _ = require('lodash')
var queue = require('d3-queue').queue;
var elasticlunr = require('elasticlunr');

var Keys = require('../../../common/Keys')
var memoize = require('../../../common/memoize')
var request = require('../request')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var request = require('../request')
var Class = require('../data/Class')
var user = require('../data/user')


function Search() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	//wait for a subject and a search term
	if (this.getHost() && this.getTermId()) {
		this.loadSearchIndex(_.noop);
	}
	else {

		// If it wasen't immitiatly avalible, wait for user to load and then it might be
		user.onAuthFinish(this.constructor.fnName, function () {
			if (this.getHost() && this.getTermId()) {
				this.loadSearchIndex(_.noop);
			}
		}.bind(this))
	}


	this.$scope.loadMore2 = this.loadMore2.bind(this)


	// this.setRyanClasses()
}


// Keep the search text and results outside of the instance so it survives route changes and other stuff
Search.searchText = ''

// Updated on search, used in ng-repeat
Search.renderedClasses = []
Search.unrenderedClasses = []

Search.fnName = 'Search'
Search.$inject = ['$scope', '$location', '$routeParams', '$timeout']

//prototype constructor
Search.prototype = Object.create(BaseDirective.prototype);
Search.prototype.constructor = Search;

// 1. Check this.$routeParams
// 2. if that is null, check user.getValue(macros.LAST_SELECTED_TERM)
// 3. return null
Search.prototype.getHost = function () {

	if (this.$routeParams.host) {
		return this.$routeParams.host
	}

	var host = user.getValue(macros.LAST_SELECTED_COLLEGE);
	if (host) {
		return host
	}
	else {
		return null
	}
};

Search.prototype.getTermId = function () {

	if (this.$routeParams.termId) {
		return this.$routeParams.termId
	}

	var termId = user.getValue(macros.LAST_SELECTED_TERM)
	if (termId) {
		return termId
	}
	else {
		return null;
	}
};


Search.prototype.loadSearchIndex = memoize(function (callback) {
	var host = this.getHost()
	var termId = this.getTermId();
	if (!host || !termId) {
		return callback('need host and term')
	}
	
	var url = Keys.create({
		host: host,
		termId: termId
	}).getHashWithEndpoint('/getSearchIndex');
	
	request({
		url: url,
		host: host,
		termId: termId
	}, function (err, result) {
		if (err) {
			elog(err);
			return;
		}

		var searchIndex = elasticlunr.Index.load(result);

		// Todo: optimize this and hopefully move it server side
		var searchConfig = {}
		searchIndex.getFields().forEach(function (field) {
			searchConfig[field] = {
				boost: 1,
				bool: "OR",
				expand: false
			};
		});


		return callback(null, searchIndex, searchConfig)
	}.bind(this))
}, function () {
	return this.getHost() + this.getTermId()
})


Search.prototype.go = function () {
	if (!this.constructor.searchText) {
		this.constructor.classes = []
		return;
	}

	this.loadSearchIndex(function (err, searchIndex, searchConfig) {
		if (err) {
			elog(err)
		}

		// Return with a ref: and a score: 
		var results = searchIndex.search(this.constructor.searchText, searchConfig)

		console.log("Search results length:", results.length);

		var classes = [];

		results.forEach(function (result) {
			classes.push(Class.create({
				hash: result.ref,
				host: this.getHost(),
				termId: this.getTermId()
			}))
		}.bind(this))

		var q = queue();

		classes.forEach(function (aClass) {
			q.defer(function (callback) {
				aClass.download(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this))
		}.bind(this))

		q.awaitAll(function (err) {
			if (err) {
				elog(err);
			}

			this.timeout(function () {

				this.constructor.unrenderedClasses = [];
				this.constructor.renderedClasses = [];

				// Put the first 15 in rendered classses and the rest in unrenderedClasses

				this.constructor.renderedClasses = classes.slice(0, 15);
				this.constructor.unrenderedClasses = classes.slice(15);
				this.$scope.$apply();

				// Scroll to the top of the search results
				document.getElementById('searchResultsId').scrollTop = 0;

			}.bind(this))

		}.bind(this))
	}.bind(this))
}

Search.focusSearchBox = function () {
	document.getElementById('leftSearchBoxID').focus()
}

Search.prototype.loadMore2 = function () {
	var more = this.constructor.unrenderedClasses.shift()
	if (more) {
		this.constructor.renderedClasses.push(more)
	};
};

Search.prototype.setRyanClasses = function () {

	// search here

	// class = JSON.stringify()

	this.constructor.classes = []


	// stuff i need to take
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
	}, {
		subject: 'CHEM',
		classUid: '3505_1161594881'
	}]
	keys.forEach(function (row) {
		row.termId = '201710'
		row.host = 'neu.edu'
	}.bind(this));


	var q = queue()

	keys.forEach(function (row) {
		var aClass = Class.create(row)
		q.defer(function (callback) {
			aClass.download(function (err) {
				callback(err)
			}.bind(this))
		}.bind(this))
		this.constructor.classes.push(aClass)
	}.bind(this))

	q.awaitAll(function (err) {
		if (err) {
			elog(err);
			return;
		}
		this.$scope.$apply();
	}.bind(this))
}


Search.prototype.onClick = function (aClass) {
	var obj = aClass;
	var url = '/graph/' + encodeURIComponent(obj.host) + '/' + encodeURIComponent(obj.termId) + '/' + encodeURIComponent(obj.subject) + '/' + encodeURIComponent(obj.classUid)
	this.$location.path(url)
}

Search.prototype.isActive = function (aClass) {
	return this.$routeParams.classUid === aClass.classUid && this.$routeParams.subject === aClass.subject
}

Search.prototype.Search = Search;
module.exports = Search;
directiveMgr.addController(Search)
