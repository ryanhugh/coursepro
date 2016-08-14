'use strict';
var queue = require('d3-queue').queue
var mkdirp = require('mkdirp');
var fs = require('fs')
var elasticlunr = require('elasticlunr');
var path = require('path')

var macros = require('../macros')
var BaseProcessor = require('./baseProcessor').BaseProcessor;
var classesDB = require('../databases/classesDB');
var sectionsDB = require('../databases/sectionsDB');
var Keys = require('../../common/Keys')



function CreateSearchIndex() {
	BaseProcessor.prototype.constructor.apply(this, arguments);
}


CreateSearchIndex.prototype = Object.create(BaseProcessor.prototype);
CreateSearchIndex.prototype.constructor = CreateSearchIndex;


CreateSearchIndex.prototype.go = function (query, callback) {
	var q = queue()

	var sections;

	q.defer(function (callback) {
		sectionsDB.find(query, {
			skipValidation: true
		}, function (err, results) {
			if (err) {
				return callback(err)
			}
			console.log("got sections");
			sections = results;
			return callback()
		}.bind(this))
	}.bind(this))

	var classes;

	q.defer(function (callback) {
		classesDB.find(query, {
			skipValidation: true
		}, function (err, results) {
			if (err) {
				return callback(err)
			}
			if (results.length === 0) {
				return callback('no classes?')
			}
			console.log("got classes");
			classes = results;
			return callback()
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		if (err) {
			return callback(err)
		}

		var index = elasticlunr();

		index.saveDocument(false)

		index.setRef('key');
		index.addField('desc');
		index.addField('name');
		index.addField('classId');
		index.addField('subject');

		classes.forEach(function (aClass) {
			aClass.key = Keys.create(aClass).getHash()
			index.addDoc(aClass)
		}.bind(this))

		var searchIndexString = JSON.stringify(index.toJSON());

		if (!query.termId) {
			elog('not implemented yet!!!')
		}

		var endpoint = 'getSearchIndex'

		var keys = Keys.create(query)

		var fileName = path.join('.', 'dist', keys.getHashWithEndpoint(endpoint));
		var folderName = path.dirname(fileName);

		mkdirp(folderName, function (err) {
			if (err) {
				return callback(err);
			}

			fs.writeFile(fileName, searchIndexString, function (err) {
				if (err) {
					return callback(err);
				}

				console.log("Successfully saved", endpoint, query.host, query.termId);

				return callback()
			}.bind(this));
		}.bind(this));
	}.bind(this))
};

CreateSearchIndex.prototype.CreateSearchIndex = CreateSearchIndex;
module.exports = new CreateSearchIndex();

if (require.main === module) {
	// module.exports.go({
	// 	host: 'neu.edu',
	// 	termId: "201710"
	// }, function (err, results) {
	// 	console.log(err, results);

	// }.bind(this));
	// 
	// swarthmore.edu/201604

	module.exports.go({
		host: 'swarthmore.edu',
		termId: "201604"
	}, function (err, results) {
		console.log(err, results);

	}.bind(this));
}