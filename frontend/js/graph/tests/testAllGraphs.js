/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

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
	// 
	// 
	// 

var _error = console.error.bind(console)


var didError = false;
console.error = function () {
	didError = true;
	_error(arguments)
}.bind(this)

window.elog = function () {
	console.error.apply(console, arguments)
	didError = true;
}.bind(this)


console.log("Running testAllGraphs!");

var q = queue(1);

Class.downloadResultsGroup({
	keys: Keys.create({
		// host: 'neu.edu',
		// termId: '201710'
		// host: 'swarthmore.edu',
		// termId: '201604'

		host: 'neu.edu',
		termId: '201710'
	})
}, function (err, results) {
	if (err) {
		elog(err)
		return;
	}

	var currSubject = null;
	results.forEach(function (row) {
		q.defer(function (callback) {
			if (row.subject != currSubject) {
				console.log("Now processing:", row.subject);
				currSubject = row.subject
			}

			if (row.subject[0] < 'N') {
				return callback()
			}



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
				if (didError) {
					console.log("Node caused error:", row.host, row.termId, row.subject, row.classUid);
				}
				didError = false;


				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		if (err) {
			elog(err)
		}
		console.log("DONE!!!");
	}.bind(this))
}.bind(this))
