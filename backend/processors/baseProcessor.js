'use strict'
var queue = require('d3-queue').queue

var Keys = require('../../common/Keys')
var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')

function BaseProcessor() {

}

BaseProcessor.prototype.preUpdateParse = function (query, callback) {
	return callback()
};

BaseProcessor.prototype.getClasses = function (queries, callback) {
	var classes = [];

	var q = queue();

	queries.forEach(function (query) {
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
				classes = classes.concat(results)
				return callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		callback(err, classes)
	}.bind(this))
};


BaseProcessor.prototype.getSections = function (queries, callback) {
	var sections = [];

	var q = queue();

	queries.forEach(function (query) {
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
				sections = sections.concat(results)
				return callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		callback(err, sections)
	}.bind(this))
};


BaseProcessor.prototype.getClassesAndSections = function (queries, callback) {
	var classes = []
	var sections = []

	var q = queue();

	q.defer(function (callback) {
		this.getSections(queries, function (err, results) {
			if (err) {
				return callback(err)
			}
			sections = results
			callback()
		}.bind(this))
	}.bind(this))

	q.defer(function (callback) {
		this.getClasses(queries, function (err, results) {
			if (err) {
				return callback(err)
			}

			classes = results
			callback()
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		if (err) {
			return callback(err)
		}
		return callback(null, classes, sections)
	}.bind(this))
};


// Get the minimum part of queries that overlap. eg,
// if given query {host:'neu.edu',termId:'201710'} and {host:'neu.edu',termId:'201630'}, the result would be {host:'neu.edu'}
BaseProcessor.prototype.getCommonHostAndTerm = function (queries) {
	if (queries.length === 0) {
		elog()
		return {}
	}
	var retVal = {}

	// Nothing after termId is supported yet. 
	var keys = ['host', 'termId']

	var currValue;
	for (var i = 0; i < keys.length; i++) {
		var keyName = keys[i];

		currValue = queries[0][keyName]
		for (var j = 0; j < queries.length; j++) {
			if (queries[j][keyName] != currValue) {
				return retVal;
			}
		}

		retVal[keyName] = currValue;
	}
	return retVal;
};

BaseProcessor.prototype.isUpdatingEntireTerm = function (queries) {
	// Don't run if only updating one class
	var shouldRun = false;
	for (var i = 0; i < queries.length; i++) {
		var query = queries[i];
		if (!query.subject) {
			shouldRun = true;
			break;
		}
	}

	return shouldRun;
};


// If config.useClassId, will return {
// 	'neu.edu201602STAT002':[aClass,aClass]
// }
// if !config.useClassId, will return {
// 	'neu.edu201602STAT002_6876877897': aClass
// }
BaseProcessor.prototype.getClassHash = function (queries, configOrCallback, callback) {
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
	var queryOverlap = this.getCommonHostAndTerm(queries);
	var matchingQuery = {
		host: queryOverlap.host
	}

	// if base query specified term, we can specify it here too and still find all the classes needed
	if (queryOverlap.termId) {
		matchingQuery.termId = queryOverlap.termId
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
					elog('duplicate classUid???', keyToRows[key], aClass)
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
