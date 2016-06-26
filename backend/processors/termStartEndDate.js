'use strict';
var sectionsDB = require('../databases/sectionsDB')
var termsDB = require('../databases/termsDB')
var _ = require('lodash')
var queue = require('d3-queue').queue


// This file adds startDate and endDate to each term based on the start and end dates in sections in that term
// The start date is the first date that over 10% of sections start on, and the end is the last date that over 10% of sections end on
// If no one date has over 10% sections start on that date, it is just the first/last date


function TermStartEndDate() {

	// runs third, after prereqClassUids
	this.priority = 2;
}


// runs on all hosts
TermStartEndDate.prototype.supportsHost = function (host) {
	return true;
};

TermStartEndDate.prototype.runOnTerm = function (query, callback) {

	sectionsDB.find(query, {
		skipValidation: true
	}, function (err, docs) {
		var startDates = {};
		var endDates = {};
		var meetingCount = 0;

		docs.forEach(function (doc) {

			if (doc.meetings) {
				doc.meetings.forEach(function (meeting) {
					if (startDates[meeting.startDate] == undefined) {
						startDates[meeting.startDate] = 0;
					}
					startDates[meeting.startDate]++

						if (endDates[meeting.endDate] == undefined) {
							endDates[meeting.endDate] = 0;
						}
					endDates[meeting.endDate]++
						meetingCount++
				}.bind(this))
			}
		}.bind(this))

		var finalStartDate;
		var finalEndDate;

		var startDateKeys = _.keys(startDates).sort(function (a, b) {
			return parseInt(a) - parseInt(b)
		}.bind(this))

		for (var i = 0; i < startDateKeys.length; i++) {
			var date = startDateKeys[i]
			if (startDates[date] > .1 * meetingCount) {
				finalStartDate = date;
				break;
			}
		}
		if (!finalStartDate) {
			console.log('Warning, no start date was definitive', startDates)
			finalStartDate = startDateKeys[0];
		}



		// Now for the end dates
		var endDateKeys = _.keys(endDates).sort(function (a, b) {
			// sort in reverse order
			return parseInt(b) - parseInt(a)
		}.bind(this))

		for (var i = 0; i < endDateKeys.length; i++) {
			var date = endDateKeys[i]
			if (endDates[date] > .1 * meetingCount) {
				finalEndDate = date;
				break;
			}
		}
		if (!finalEndDate) {
			console.log('Warning, no end date was definitive', endDates)
			finalEndDate = endDateKeys[0];
		}


		termsDB.update(query, {
			$set: {
				startDate: finalStartDate,
				endDate: finalEndDate
			}
		}, {
			shouldBeOnlyOne: true
		}, function (err) {
			callback(err, {
				endDate: finalEndDate,
				startDate: finalStartDate
			})
		}.bind(this))
	}.bind(this))
};



TermStartEndDate.prototype.go = function (baseQuery, callback) {

	if (baseQuery.host && baseQuery.termId) {
		return this.runOnTerm(baseQuery, function (err, result) {
			if (err) {
				return callback(err)
			}
			return callback(null, [result])
		}.bind(this));
	}
	else {
		var q = queue()
		var results = [];

		//For each term in the host, update the 
		termsDB.find({
			host: baseQuery.host
		}, {
			skipValidation: true
		}, function (err, terms) {

			terms.forEach(function (term) {
				if (!term.termId) {
					return;
				}
				q.defer(function (callback) {
					this.runOnTerm({
						host: term.host,
						termId: term.termId
					}, function (err, result) {

						results.push(result)

						callback(err)
					}.bind(this))
				}.bind(this))
			}.bind(this))

			q.awaitAll(function (err) {
				callback(err, results)
			}.bind(this))

		}.bind(this))
	}
}


TermStartEndDate.prototype.tests = function () {
	this.go({
		host: 'neu.edu'
	}, function (err) {
		console.log("DONE!", err);
	}.bind(this))

};


TermStartEndDate.prototype.TermStartEndDate = TermStartEndDate;

module.exports = new TermStartEndDate();

if (require.main === module) {
	module.exports.tests();
}

