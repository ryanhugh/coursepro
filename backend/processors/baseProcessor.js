'use strict'
var queue = require('d3-queue').queue

var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')

function BaseProcessor() {

}

BaseProcessor.prototype.preUpdateParse = function(query, callback) {
	return callback()
};


BaseProcessor.prototype.getSectionsAndClasses = function (query, callback) {
	var classes = []
	var sections = []

	var q = queue();

	q.defer(function (callback) {
		classesDB.find(query, {
			skipValidation: true,
			shouldBeOnlyOne: false,
			sanitize: true,
			removeControllers: true
		}, function (err, results) {
			if (err) {
				return callback(err)
			}
			classes = results
			return callback()
		}.bind(this))
	}.bind(this))

	q.defer(function (callback) {
		sectionsDB.find(query, {
			skipValidation: true,
			shouldBeOnlyOne: false,
			sanitize: true,
			removeControllers: true
		}, function (err, results) {
			if (err) {
				return callback(err)
			}
			sections = results
			return callback()
		}.bind(this))
	}.bind(this))


	q.awaitAll(function (err) {
		if (err) {
			return callback(err)
		}
		return callback(null, classes, sections)
	}.bind(this))
};


// If config.useClassId, will return {
// 	'neu.edu201602STAT002':[aClass,aClass]
// }
// if !config.useClassId, will return {
// 	'neu.edu201602STAT002_6876877897': aClass
// }
BaseProcessor.prototype.getClassHash = function (query, configOrCallback, callback) {
	var config;
	if (typeof configOrCallback === 'function') {
		callback = configOrCallback
		config = {}
	}
	else {
		config = configOrCallback
	}

	if (!callback) {
		elog('dont have callback?')
	}

	// and find all classes that could be matched
	var matchingQuery = {
		host: query.host
	}

	// if base query specified term, we can specify it here too and still find all the classes needed
	if (query.termId) {
		matchingQuery.termId = query.termId
	}


	//make obj to find results here quickly
	var keyToRows = {};

	classesDB.find(matchingQuery, {
		skipValidation: true
	}, function (err, results) {
		if (err) {
			console.log(err);
			return callback(err)
		}

		results.forEach(function (aClass) {
			if (!aClass.host || !aClass.termId || !aClass.subject || !aClass.classUid) {
				elog("ERROR class dosent have required fields??", aClass);
				return;
			}

			// multiple classes could have same key
			var key = aClass.host + aClass.termId + aClass.subject;
			if (config.useClassId) {
				key += aClass.classId

				if (!keyToRows[key]) {
					keyToRows[key] = []
				}

				// only need to keep subject and classUid
				keyToRows[key].push(aClass)
			}
			else if (aClass.classUid) {
				key += aClass.classUid

				if (keyToRows[key]) {
					elog('duplicate classUid???',keyToRows[key],aClass)
				}

				keyToRows[key] = aClass
			}
			else {
				elog('Cant use classUid if dont have classUid!', aClass)
			}


		}.bind(this));

		return callback(null, keyToRows);
	}.bind(this))
}


BaseProcessor.prototype.BaseProcessor = BaseProcessor;
module.exports = new BaseProcessor()
