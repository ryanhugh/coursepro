'use strict';
var queue = require('d3-queue').queue
var _ = require('lodash')

var macros = require('../macros')
var BaseProcessor = require('./baseProcessor').BaseProcessor;
var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')
var termsDB = require('../databases/termsDB')
var Keys = require('../../common/Keys')

function TermSearchHints() {

}

TermSearchHints.prototype = Object.create(BaseProcessor.prototype);
TermSearchHints.prototype.constructor = TermSearchHints;




TermSearchHints.prototype.go = function (query, callback) {

	this.getSectionsAndClasses(query, function (err, classes, sections) {
		if (err) {
			return callback(err)
		}

		var highestSections = [];

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

			if (highestSections.length < 2) {
				highestSections.push(thisObj)
				return;
			}
			else {

				if (score > highestSections[0].score) {
					highestSections[0] = thisObj
				}
				else if (score > highestSections[1].score) {
					highestSections[1] = thisObj
				}
			}
		}.bind(this))

		console.log(highestSections[0].class.name, highestSections[1].class.subject, highestSections[1].class.classId, highestSections[1].class.name);
		console.log(highestSections[0].score, highestSections[1].score);


		// var highest2 = [];

		// var max = sections[0];
		// var maxScore = 0;

		// sections.forEach(function (section) {
		// 	var score = section.seatsCapacity - section.seatsRemaining;



		// 	var hash = Keys.create({
		// 		host: section.host,
		// 		termId: section.termId,
		// 		subject: section.subject,
		// 		classUid: section.classUid
		// 	}).getHash();


		// 	// console.log(classHash[hash],hash,maxScore);

		// 	var aClass = classHash[hash]

		// 	aClass.score = score

		// 	if (!aClass.name.match(/General|Fundamentals|Principals|Introduction|First\-Year/gi)) {
		// 		return;
		// 	}

		// 	if (highest2.length < 2) {
		// 		highest2.push(aClass)
		// 		return;
		// 	}
		// 	else {

		// 		if (score > highest2[0].score) {
		// 			highest2[0] = aClass
		// 		}
		// 		else if (score > highest2[1].score) {
		// 			highest2[1] = aClass
		// 		}
		// 	}

		// }.bind(this))

		// var hash = Keys.create({
		// 	host: max.host,
		// 	termId: max.termId,
		// 	subject: max.subject,
		// 	classUid: max.classUid
		// }).getHash();


		// console.log(highest2[0], highest2[1]);




	}.bind(this))






};



TermSearchHints.prototype.TermSearchHints = TermSearchHints;
module.exports = new TermSearchHints();


if (require.main === module) {
	module.exports.go({
		host: 'neu.edu',
		termId: "201710"
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
