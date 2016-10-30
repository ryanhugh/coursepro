'use strict';
var mkdirp = require('mkdirp');
var queue = require('d3-queue').queue
var fs = require('fs')
var path = require('path')
var _ = require('lodash')

var macros = require('../macros')
var BaseProcessor = require('./baseProcessor').BaseProcessor;
var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')
var subjectsDB = require('../databases/subjectsDB')
var Keys = require('../../common/Keys')


function SimplifyProfList() {
	BaseProcessor.prototype.constructor.apply(this, arguments);
}


SimplifyProfList.prototype = Object.create(BaseProcessor.prototype);
SimplifyProfList.prototype.constructor = SimplifyProfList;



SimplifyProfList.prototype.go = function (queries, callback) {

	this.getSections(queries, function (err, sections) {
		if (err) {
			return callback(err)
		}

		var updatedSections = []

		var sectionGrouped = this.groupSectionsByClass(sections);
		sectionGrouped.forEach(function (sectionGroup) {

			var profCount = {}

			// Populate prof count. Counts if prof is present in any meetings in a section
			sectionGroup.forEach(function (section) {
				if (!section.meetings) {
					return;
				}

				var thisSectionProfs = []


				section.meetings.forEach(function (meeting) {
					if (!meeting.profs) {
						return;
					}

					// Keep a reference to the full list of professors
					if (!meeting.allProfs) {
						meeting.allProfs = meeting.profs.slice(0)
					}

					meeting.profs.forEach(function (prof) {
						if (!_(thisSectionProfs).includes(prof)) {
							thisSectionProfs.push(prof)
						}
					}.bind(this))
				}.bind(this))



				thisSectionProfs.forEach(function (prof) {
					var id = section.host
					if (!profCount[prof]) {
						profCount[prof] = 0
					}
					profCount[prof]++;
				}.bind(this))
			}.bind(this))

			if (sectionGroup.length == 1) {
				return;
			}

			var profsOnEverySection = [];

			// Find the profs that are listed on every section
			for (var prof in profCount) {
				if (profCount[prof] == sectionGroup.length) {
					profsOnEverySection.push(prof)
				}
			}


			// Remove any prof in prof count that is present in all sectionGroup and when there are other profs also listed on the same section
			sectionGroup.forEach(function (section) {

				var count = 0;

				if (!section.meetings) {
					return;
				}

				section.meetings.forEach(function (meeting) {

					// If all the professors in this meeting are on every meeting, don't remove any of them.  
					if (meeting.profs.length == profsOnEverySection.length) {
						return;
					}

					profsOnEverySection.forEach(function (prof) {
						if (meeting.profs.length > 1) {
							count++;
							_.pull(meeting.profs, prof)
						}
					}.bind(this))
				}.bind(this))

				if (count > 0) {
					updatedSections.push(section)
					console.log("Removing ", count, 'profs from ', section.classUid, section.crn);
				}

			}.bind(this))
		}.bind(this))


		var q = queue();

		updatedSections.forEach(function (section) {
			var obj = Keys.create(section).getObj();

			q.defer(function (callback) {
				sectionsDB.update(obj, section, {
					shouldBeOnlyOne: true
				}, function (err) {
					callback(err)
				}.bind(this))
			}.bind(this))

		}.bind(this))

		q.awaitAll(function (err) {
			if (err) {
				return callback(err)
			}
			callback(null, updatedSections)
			
		}.bind(this))

	}.bind(this))

}






SimplifyProfList.prototype.SimplifyProfList = SimplifyProfList;
module.exports = new SimplifyProfList();


if (require.main === module) {
	module.exports.go([{
		// host: 'neu.edu',
		// termId: "201710",
		// subject: 'PHYS',
		// classUid: '1161_1407358072'
	}], function (err, results) {
		console.log("done,", err, results);

		// console.log(results[0].meetings);

	}.bind(this));


	// module.exports.go({
	// 	host: 'neu.edu',
	// 	// termId: "201710"
	// }, function (err, results) {
	// 	console.log("done,", err, results);

	// }.bind(this));
}
