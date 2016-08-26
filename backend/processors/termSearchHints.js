'use strict';
var queue = require('d3-queue').queue
var _ = require('lodash')

var macros = require('../macros')
var BaseProcessor = require('./baseProcessor').BaseProcessor;
var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')
var termsDB = require('../databases/termsDB')
var Keys = require('../../common/Keys')


// Genereates the hints to put in the search box for each term
// could also change this to be most seats capacity instead of most seats taken, or highest avg seat capacity of a class
// also add where and profs


function TermSearchHints() {

}

TermSearchHints.prototype = Object.create(BaseProcessor.prototype);
TermSearchHints.prototype.constructor = TermSearchHints;




TermSearchHints.prototype.go = function (query, callback) {
	if (query.termId || query.subject || query.classId || query.classUid) {
		return callback()
	}

	this.getSectionsAndClasses(query, function (err, classes, sections) {
		if (err) {
			return callback(err)
		}

		var highestClasses = [];
		var sectionHash = {}

		sections.forEach(function (section) {
			sectionHash[Keys.create(section).getHash()] = section;
		}.bind(this))

		classes.forEach(function (aClass) {
			if (!aClass.crns || aClass.crns.length === 0) {
				return;
			}

			if (aClass.name.match(/(^|\s)+Lab(\s|$)+/gi) || aClass.name.match(/(^|\s)+Thesis(\s|$)+/gi)) {
				return;
			}

			if (!aClass.name.match(/General|Fundamentals|Principals|Introduction|First\-Year/gi)) {
				return;
			}

			var score = 0;


			aClass.crns.forEach(function (crn) {

				var hash = Keys.create({
					host: aClass.host,
					termId: aClass.termId,
					subject: aClass.subject,
					classUid: aClass.classUid,
					crn: crn
				}).getHash()


				var section = sectionHash[hash];
				if (!section.meetings || section.meetings.length === 0) {
					return;
				}

				score += section.seatsCapacity - section.seatsRemaining;
			}.bind(this))

			var thisObj = {
				class: aClass,
				score: score
			}

			if (highestClasses.length < 2) {
				highestClasses.push(thisObj)
				return;
			}
			else {

				if (score > highestClasses[0].score) {
					highestClasses[0] = thisObj
				}
				else if (score > highestClasses[1].score) {
					highestClasses[1] = thisObj
				}
			}
		}.bind(this))

		var hints = [highestClasses[0].class.name, highestClasses[1].class.subject + ' ' +  highestClasses[1].class.classId]

		if (query.host === 'neu.edu') {
			hints.push('Leena Razzaq')
			hints.push('Physics 1')
			hints.push('Calculus 2')
			hints.push('Banking')
			hints.push('Robotics')
			hints.push('PHYS 1151')
			hints.push('PHIL 1101')
		}

		console.log("Settings search hints to ", hints);

		termsDB.update(query, {
			$set: {
				searchHints: hints
			}
		}, {
			shouldBeOnlyOne: false
		}, function (err, results) {
			callback(err, hints)
		}.bind(this))
	}.bind(this))
};



TermSearchHints.prototype.TermSearchHints = TermSearchHints;
module.exports = new TermSearchHints();


if (require.main === module) {
	module.exports.go({
		host: 'neu.edu',
		// termId: "201710"
	}, function (err, results) {
		console.log("done,", err, results);

	}.bind(this));


	// module.exports.go({
	// 	host: 'neu.edu',
	// 	// termId: "201710"
	// }, function (err, results) {
	// 	console.log("done,", err, results);

	// }.bind(this));
}
