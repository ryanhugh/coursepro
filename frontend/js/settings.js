'use strict';
var queue = require('queue-async')
var _ = require('lodash')
var async = require('async')
var moment = require('moment')

var request = require('./request')
var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')

function Settings($scope) {
	BaseDirective.prototype.constructor.apply(this, arguments);

	// this.

	// this.testttt='fdsafsafsa'

	// return

	// $scope.v=this;

	this.user = null;

	async.waterfall([

			//fetch the user data
			function (callback) {

				request({
					url: '/getUser',
					type: 'POST',
					auth: true
				}, function (err, user) {
					if (err) {
						console.log('ERROR', err)
						return callback(err)
					}
					this.user = user;



					
					// $scope.user = user;
					$scope.$apply()



					return callback()
				}.bind(this))
			}.bind(this),

			//fetch class for every section and class _id
			function (callback) {

				var q = queue()
				var classes = [];
				var sections = [];

				//fetch all the class data from the _id's in the user watch list
				this.user.watching.classes.forEach(function (classMongoId) {
					q.defer(function (callback) {
						request({
							url: '/listClasses',
							body: {
								_id: classMongoId
							}
						}, function (err, results) {
							if (err) {
								console.log('ERROR couldnt get data for ', err, classMongoId)
								return callback(err)
							}
							if (results.length == 0) {
								console.log('ERROR couldnt get data for ', classMongoId)
								return callback();
							}
							var theClass = results[0];

							classes.push(theClass)

							callback()
						}.bind(this))
					}.bind(this))
				}.bind(this))


				//same thing for the sections
				this.user.watching.sections.forEach(function (sectionMongoId) {
					q.defer(function (callback) {
						request({
							url: '/listSections',
							body: {
								_id: sectionMongoId
							}
						}, function (err, results) {
							if (err) {
								console.log('ERROR couldnt get data for ', err)
								return callback(err);
							}
							if (results.length == 0) {
								console.log('ERROR couldnt get data for ', sectionMongoId)
								return callback();
							}

							sections.push(results[0])
							callback()
						}.bind(this))
					}.bind(this))
				}.bind(this))

				q.awaitAll(function (err) {
					if (err) {
						console.log('ERROR', err)
					}

					callback(null, sections, classes)

				}.bind(this))

			}.bind(this),

			//get a list of hosts -> list of termTexts
			function (sections, classes, callback) {

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

			$scope.classes = classes;

			$scope.$apply()

		}.bind(this))



	// this.settingsElement = document.getElementById('settingsId');
	// this.masterContainer = document.getElementById('masterContainerId');
}

Settings.isPage = true;

//prototype constructor
Settings.prototype = Object.create(BaseDirective.prototype);
Settings.prototype.constructor = Settings;

Settings.prototype.test = function() {
	console.log('fdnsafhdasfkl')
};



// Settings.prototype.populateFields = function (userData) {

// };

// Settings.prototype.isVisible = function () {

// 	// if the element has a parent, it is in the container, if not it needs to be added
// 	if (this.settingsElement.parentElement) {
// 		return true
// 	}
// 	else {
// 		return false;
// 	}
// }



// Settings.prototype.show = function () {


// 	if (this.isVisible()) {
// 		return;
// 	}

// 	// document.body.style.height = '';
// 	// document.body.style.width = '';


// 	this.masterContainer.appendChild(this.settingsElement);

// }

// Settings.prototype.hide = function () {
// 	$(this.settingsElement).detach()
// };



Settings.prototype.Settings = Settings;
module.exports = Settings;
directiveMgr.addDirective(Settings)