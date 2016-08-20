'use strict';

var _ = require('lodash')
var queue = require('d3-queue').queue
var Class = require('../../data/Class')
var graph = require('../graph')
var Keys = require('../../../../common/Keys')
	// This file renders all graphs in the entire semester
	// As a "fuzzing" attempt to find bugs
	// Run by specifying #testAllGraphs after debug.html in karma
	// 

// if (_(location.hash).includes('testAllGraphs')) {
	console.log("Running testAllGraphs!");

	var q = queue(1);

	Class.downloadResultsGroup({
		keys: Keys.create({
			host: 'neu.edu',
			termId: '201710'
		})
	}, function (err, results) {

		results.forEach(function (row) {
			q.defer(function (callback) {
				graph.instance.go({
					host: row.host,
					termId: row.termId,
					subject: row.subject,
					classUid: row.classUid
				}, function (err) {
					if (err) {
						elog(err)
						return callback(err)
					}
					// expect(!err).toBe(true)





					callback()
				}.bind(this))
			}.bind(this))
		}.bind(this))

		q.awaitAll(function (err) {
			if (err) {
				elog(err)
			}
			console.log("DONE!!!");
			done()
		}.bind(this))


	}.bind(this))







// }
