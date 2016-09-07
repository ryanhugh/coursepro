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
var Subject = require('../data/Subject')
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


	this.$scope.loadMore = this.loadMore.bind(this)


	// Focus the highlighted result
	this.timeout(function () {
		this.loadScrollOffset()

		var elem = this.$document[0].getElementById('searchResultsId')

		if (!elem) {
			return
		}

		elem = elem.querySelector('.searchResultRow.active')

		if (!elem) {
			return
		}
		elem.focus()

	}.bind(this))

	this.$scope.$on('$destroy', function () {
		var elem = this.$document[0].getElementById('searchResultsId')
		if (!elem) {
			return
		}
		this.constructor.scrollTop = elem.scrollTop
	}.bind(this))

	this.loggingTimer = null;
}


// Keep the search text and results outside of the instance so it survives route changes and other stuff
Search.searchText = ''

Search.scrollTop = 0;

// Updated on search, used in ng-repeat
Search.renderedClasses = []
Search.unrenderedClasses = []

Search.fnName = 'Search'
Search.$inject = ['$scope', '$location', '$routeParams', '$timeout', '$document']

//prototype constructor
Search.prototype = Object.create(BaseDirective.prototype);
Search.prototype.constructor = Search;

Search.prototype.loadScrollOffset = function () {

	var elem = this.$document[0].getElementById('searchResultsId')


	if (!elem) {
		return
	}

	if (this.constructor.scrollTop) {
		elem.scrollTop = this.constructor.scrollTop;
	}
};

// 1. Check this.$routeParams
// 2. if that is null, check user.getValue(macros.LAST_SELECTED_COLLEGE)
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

Search.setSearchText = function (text) {
	this.searchText = text;
	document.getElementById('leftSearchBoxID').value = text
};

// This is only fired if the focus is somewhere inside <div search></div>
Search.prototype.onKeyDown = function ($event) {
	if ($event.which === 13) {
		setTimeout(function () {
			$event.target.click()
		}.bind(this), 0)
		$event.preventDefault();
		return;
	}

	if ($event.which === 38 || $event.which === 40) {
		var currElement = this.$document[0].activeElement

		// Up
		if ($event.which === 38) {
			if (_(currElement.classList).includes('searchResultRow')) {

				var nextItem = currElement;

				// After this loop nextItem will either be null or the prior row in the search results
				while ((nextItem = nextItem.previousSibling)) {
					if (_(nextItem.classList).includes('searchResultRow')) {
						break;
					}
				}

				if (!nextItem) {
					this.constructor.focusSearchBox()
				}
				else {
					nextItem.focus()
				}
			}
			else {
				this.constructor.focusSearchBox()
			}
		}

		// Down
		else {
			if (_(currElement.classList).includes('searchResultRow')) {

				var nextItem = currElement;

				// After this loop nextItem will either be null or the prior row in the search results
				while ((nextItem = nextItem.nextSibling)) {
					if (_(nextItem.classList).includes('searchResultRow')) {
						break;
					}
				}

				if (!nextItem) {
					var firstResult = document.getElementsByClassName('searchResultRow')[0];
					if (firstResult) {
						firstResult.focus()
					}
				}
				else {
					nextItem.focus()
				}
			}
			else {
				var firstResult = document.getElementsByClassName('searchResultRow')[0];
				if (firstResult) {
					firstResult.focus()
				}
			}
		}


		$event.preventDefault(); // prevent the default action (scroll / move caret)
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

Search.prototype.startLoggingTimer = function () {
	clearTimeout(this.loggingTimer);
	this.loggingTimer = setTimeout(function () {

		ga('send', {
			'hitType': 'pageview',
			'page': '/search/' + encodeURIComponent(this.constructor.searchText),
			'title': 'Coursepro.io'
		});


		request({
			url: '/log',
			body: {
				type: 'search',
				text: this.constructor.searchText,
			},
			useCache: false
		}, function (err, response) {
			if (err) {
				elog("ERROR: couldn't log search :(", err, response);
			}
		}.bind(this))
	}.bind(this), 2000)
};


Search.prototype.go = function () {
	this.constructor.scrollTop = 0;
	if (!this.constructor.searchText) {
		this.constructor.classes = []
		return;
	}

	var q = queue();

	var subjects = [];

	q.defer(function (callback) {
		Subject.createMany(Keys.create({
			host: this.getHost(),
			termId: this.getTermId()
		}), function (err, results) {
			if (err) {
				callback(err)
			}
			subjects = results
			callback()

		}.bind(this))
	}.bind(this))

	var searchIndex = null
	var searchConfig = null;

	q.defer(function (callback) {
		this.loadSearchIndex(function (err, theSearchIndex, theSearchConfig) {
			if (err) {
				return callback(err)
			}
			searchIndex = theSearchIndex;
			searchConfig = theSearchConfig;
			callback()
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		if (err) {
			elog(err);
			return callback(err)
		}

		this.startLoggingTimer();

		// If the search term starts with a subject (eg cs2500), put a space after the subject
		var searchTerm = this.constructor.searchText;
		var lowerCaseSearchTerm = searchTerm.toLowerCase()

		for (var i = 0; i < subjects.length; i++) {
			var subject = subjects[i]
			if (lowerCaseSearchTerm.startsWith(subject.subject.toLowerCase())) {
				var remainingSearch = searchTerm.slice(subject.subject.length);

				// Only rewrite the search if the rest of the query has a high probability of being a classId.
				if (remainingSearch.length > 5) {
					break;
				}
				var match = remainingSearch.match(/\d/g)

				if (!match || match.length < 3) {
					break;
				}
				else {
					searchTerm = searchTerm.slice(0, subject.subject.length) + ' ' + searchTerm.slice(subject.subject.length)
				}
				break;
			}
		}


		// Returns an array of objects that has a .ref and a .score
		// The array is sorted by score (with the highest matching closest to the beginning)
		// eg {ref:"neu.edu/201710/ARTF/1123_1835962771", score: 3.1094880801464573}
		var results = searchIndex.search(searchTerm, searchConfig)

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
				var elem = document.getElementById('searchResultsId');
				if (elem) {
					elem.scrollTop = 0;
				}

			}.bind(this))
		}.bind(this))
	}.bind(this))
}

// Keep the cursor at the end of the text in the box after focus
// http://stackoverflow.com/questions/1056359/set-mouse-focus-and-move-cursor-to-end-of-input-using-jquery
Search.focusSearchBox = function () {
	var elem = document.getElementById('leftSearchBoxID')
	if (elem) {
		var value = elem.value;
		elem.value = '';
		elem.focus()
		elem.value = value;
	}
}

Search.prototype.loadMore = function () {
	var more = this.constructor.unrenderedClasses.shift()
	if (more) {
		this.constructor.renderedClasses.push(more)
	};
};

Search.prototype.onClick = function (aClass) {
	var url = '/graph/' + encodeURIComponent(aClass.host) + '/' + encodeURIComponent(aClass.termId) + '/' + encodeURIComponent(aClass.subject) + '/' + encodeURIComponent(aClass.classUid)
	this.$location.path(url)
}

Search.prototype.isActive = function (aClass) {
	return this.$routeParams.classUid === aClass.classUid && this.$routeParams.subject === aClass.subject
}

Search.prototype.Search = Search;
module.exports = Search;
directiveMgr.addController(Search)
