'use strict';
var BaseProcessor = require('./baseProcessor').BaseProcessor;
var macros = require('../macros')
var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')
var subjectsDB = require('../databases/subjectsDB')
var mkdirp = require('mkdirp');
var queue = require('d3-queue').queue
var fs = require('fs')


function DatabaseDumps() {

}


DatabaseDumps.prototype = Object.create(BaseProcessor.prototype);
DatabaseDumps.prototype.constructor = DatabaseDumps;



DatabaseDumps.prototype.saveRows = function (endpoint, results, callback) {

	// list of host + termId to the files that the classes go in;
	var classLists = {};

	results.forEach(function (row) {

		var key = row.host + '/' + row.termId

		if (!classLists[key]) {
			classLists[key] = {
				list: [],
				host: row.host,
				termId: row.termId

			}
		}

		classLists[key].list.push(row);

	}.bind(this));

	var q = queue();

	for (var attrName in classLists) {
		q.defer(function (callback) {
			var rowData = classLists[attrName]

			var folderName = './frontend/static/' + endpoint + '/' + rowData.host;
			var fileName = folderName + '/' + rowData.termId;

			mkdirp(folderName, function (err) {
				if (err) {
					return callback(err);
				}

				fs.writeFile(fileName, JSON.stringify(rowData.list), function (err) {
					if (err) {
						return callback(err);
					}

					console.log("Successfully saved", endpoint, rowData.host, rowData.termId);

					return callback()
				}.bind(this));
			}.bind(this));
		}.bind(this))
	}

	q.awaitAll(function (err) {
		if (err) {
			return callback(err)
		}

		callback()
	}.bind(this))
}



DatabaseDumps.prototype.go = function (query, callback) {

	// Don't run if only one class was updated
	if (query.classUid || query.classId) {
		return;
	}


	var searchQuery = {
		host: query.host
	}

	if (query.termId) {
		searchQuery.termId = query.termId
	}

	var q = queue()

	q.defer(function (callback) {
		classesDB.find(searchQuery, {
			skipValidation: true
		}, function (err, results) {
			if (err) {
				return callback(err)
			}
			this.saveRows('listClasses', results, function (err) {
				return callback(err)
			}.bind(this))
		}.bind(this))
	}.bind(this))

	q.defer(function (callback) {
		sectionsDB.find(searchQuery, {
			skipValidation: true
		}, function (err, results) {
			if (err) {
				return callback(err)
			}
			this.saveRows('listSections', results, function (err) {
				return callback(err)
			}.bind(this))
		}.bind(this))
	}.bind(this))

	q.defer(function (callback) {
		subjectsDB.find(searchQuery, {
			skipValidation: true
		}, function (err, results) {
			if (err) {
				return callback(err)
			}
			this.saveRows('listSubjects', results, function (err) {
				return callback(err)
			}.bind(this))
		}.bind(this))
	}.bind(this))

	console.warn("NEED TO ADD TERM AND COLLEG EHERE TOOOO");

	q.awaitAll(function (err) {
		callback(err)
	}.bind(this))
}






DatabaseDumps.prototype.DatabaseDumps = DatabaseDumps;
module.exports = new DatabaseDumps();


if (require.main === module) {
	module.exports.go({
		host: 'neu.edu',
		termId: "201710"
	}, function (err, results) {


	}.bind(this));
}
