'use strict';
var queue = require('queue-async')
var _ = require('lodash')
var async = require('async')
var moment = require('moment')

var request = require('../request')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')

function Settings($scope) {
	BaseDirective.prototype.constructor.apply(this, arguments);

	async.waterfall([

			//fetch the user data
			function (callback) {
				user.download(callback)
			}.bind(this),

			//fetch class for every section and class _id
			function (callback) {
				user.loadWatching(callback)
			}.bind(this),

			//get a list of hosts -> list of termTexts
			function (callback) {

				var hosts = [];

				classes.forEach(function (theClass) {

					//keep track of the hosts so we can get all the term texts
					if (!_(hosts).includes(theClass.host)) {
						hosts.push(theClass.host)
					}
				}.bind(this))

				//get the terms text, so we can say Spring 2016 or Fall 2015 next to the title of the classes
				async.map(hosts, function (host, callback) {

						request({
							url: '/listTerms',
							body: {
								host: host
							}
						}, callback)

					}.bind(this),
					function (err, results) {
						if (err) {
							console.log("ERROR", err)
						};
						callback(null, sections, classes, _.flatten(results))
					}.bind(this))
			}
		],
		function (err, sections, classes, termTexts) {
			if (err) {
				console.log('ERROR', err)
					//don't return
			}



			classes.forEach(function (aClass) {
				if (aClass.sections) {
					console.log("ERROR class already has sections attr??", aClass)
				}
				aClass.sections = []

				//loop through terms and find one that matches
				for (var i = 0; i < termTexts.length; i++) {
					if (_.isEqual(_.pick(aClass, 'host', 'termId'), _.pick(termTexts[i], 'host', 'termId'))) {
						aClass.termText = termTexts[i].text
					}
				};


			}.bind(this))

			sections.forEach(function (section) {

				var startTimes = [];

				//get all start times that exit and startDate != endDate
				if (section.meetings) {
					section.meetings.forEach(function (meeting) {

						//exam, don't use this one
						if (meeting.startDate == meeting.endDate) {
							return;
						}
						if (!meeting.times) {
							return;
						}
						for (var dayIndex in meeting.times) {

							meeting.times[dayIndex].forEach(function (dayTime) {
								var start = dayTime.start
								if (!_(startTimes).includes(start)) {
									startTimes.push(start)
								}
							}.bind(this))
						}
					}.bind(this))
				}

				var startStrings = [];
				startTimes.forEach(function (startTime) {
					startStrings.push(moment.utc(startTime * 1000).format('h:mm a'))
				}.bind(this))

				section.startTimes = startStrings.join(', ')


				//pick all the key:values that should be identical to the matching class
				var sectionPath = _.pick(section, 'host', 'termId', 'subject', 'classId')

				for (var i = 0; i < classes.length; i++) {

					var classPath = _.pick(classes[i], 'host', 'termId', 'subject', 'classId')

					//find the class that has the crn of this section
					if (_.isEqual(sectionPath, classPath) && _(classes[i].crns).includes(section.crn)) {
						classes[i].sections.push(section)
						return;
					}
				}
				console.log('ERROR couldnt match seciton', section, 'with a class...', user)
					//maybe make an "other" at the bottom at this point?
			}.bind(this))

			this.$scope.classes = classes;

			this.$scope.$apply()

		}.bind(this))
}

Settings.isPage = true;

//prototype constructor
Settings.prototype = Object.create(BaseDirective.prototype);
Settings.prototype.constructor = Settings;

Settings.prototype.test = function() {
	console.log('fdnsafhdasfkl')
};




Settings.prototype.Settings = Settings;
module.exports = Settings;
directiveMgr.addDirective(Settings)