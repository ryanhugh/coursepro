'use strict';
var queue = require('queue-async')
var _ = require('lodash')
var async = require('async')
var moment = require('moment')

var request = require('../request')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')
var Term = require('../Term')

function Settings() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	async.waterfall([

			//fetch the user data
			function (callback) {
				user.download(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this),

			//fetch class for every section and class _id
			function (callback) {
				user.loadAllLists(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this),

			function (callback) {
				var q = queue();

				//load all the sections of all the classes being watched
				user.getAllClassesInLists().forEach(function (aClass) {
					q.defer(function (callback) {
						aClass.loadSections(function (err) {
							callback(err)
						}.bind(this))
					}.bind(this))
				}.bind(this))

				q.awaitAll(function (err) {
					callback(err)
				}.bind(this))


			}.bind(this),

			//get a list of hosts -> list of termTexts
			function (callback) {

				//get a unique list of the term data to make some terms
				var termDatas = [];

				user.getAllClassesInLists().forEach(function (aClass) {
					var termData = _.pick(aClass, 'host', 'termId')

					if (_.filter(termDatas, termData).length === 0) {
						termDatas.push(termData)
					};

				}.bind(this))

				//make some terms from the term data
				//get the terms text, so we can say Spring 2016 or Fall 2015 next to the title of the classes
				async.map(termDatas, function (termData, callback) {
					Term.create(termData).download(callback)
				}.bind(this), function (err, terms) {
					callback(null, terms)
				}.bind(this))
			}
		],
		function (err, terms) {
			if (err) {
				console.log('ERROR', err)
					//don't return
			}

			var classes = user.getAllClassesInLists();


			classes.forEach(function (aClass) {

				//loop through terms and find one that matches
				for (var i = 0; i < terms.length; i++) {
					if (_.isEqual(_.pick(aClass, 'host', 'termId'), _.pick(terms[i], 'host', 'termId'))) {
						aClass.termText = terms[i].text
					}
				};
			}.bind(this))


			this.$scope.classes = classes
			this.$scope.user = user;

			this.$scope.$apply()

		}.bind(this))
}

Settings.isPage = true;

Settings.$inject = ['$scope', '$timeout']

//prototype constructor
Settings.prototype = Object.create(BaseDirective.prototype);
Settings.prototype.constructor = Settings;


Settings.prototype.getLoadingHidden = function () {
	var activeRequests = user.activeRequestCount;
	var timeDiff = new Date().getTime() - user.lastRequestTime;

	if (activeRequests <= 0) {

		//recalculate 100 ms after last update
		if (timeDiff < 100) {
			this.$timeout(function () {}, 100 - timeDiff)
			return false;
		}
		else if (timeDiff < 5000) {
			this.$timeout(function () {}, 5000 - timeDiff)
			return true;
		}
		else {
			return false;
		}
	}
	else {

		//recalculate 100 ms after last update
		if (timeDiff < 100) {
			this.$timeout(function () {}, 100 - timeDiff)
			return false;
		}
		else {
			return true;
		}
	}
};


//show loading if has been loading for 100ms
//this dosent work if another request is fired (which resets user.lastRequestTime)
//or if two separate requests were running 100ms apart
//...but is good enough for now
Settings.prototype.showLoadingText = function () {
	var timeDiff = new Date().getTime() - user.lastRequestTime;
	if (user.activeRequestCount > 0 && timeDiff > 100) {
		return true;
	}
	else {
		return false;
	}
};



Settings.prototype.Settings = Settings;
module.exports = Settings;
directiveMgr.addDirective(Settings)