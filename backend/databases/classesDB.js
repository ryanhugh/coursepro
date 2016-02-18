'use strict';
var queue = require('d3-queue')
var async = require('async')


var BaseDB = require('./baseDB').BaseDB;
var usersDB = require('./usersDB')


function ClassesDB() {
	this.tableName = 'classes'
	BaseDB.prototype.constructor.apply(this, arguments);
}


//prototype constructor
ClassesDB.prototype = Object.create(BaseDB.prototype);
ClassesDB.prototype.constructor = ClassesDB;


ClassesDB.prototype.isValidLookupValues = function (lookupValues) {
	if (BaseDB.prototype.isValidLookupValues(lookupValues)) {
		return true;
	}
	else if (lookupValues.host && lookupValues.termId && lookupValues.subject) {
		return true;
	}
	else {
		return false;
	}
};

ClassesDB.prototype.updateDatabase = function (newData, oldData, callback) {
	if (!callback) {
		callback = function () {}
	}

	// if nothing changed, return
	if (!this.shouldUpdateDB(newData, oldData)) {
		return callback(null, newData);
	}

	// if someone is watching this class, email them
	usersDB.classUpdated(oldData, newData);

	BaseDB.prototype.updateDatabase.call(this, newData, oldData, callback);
}

ClassesDB.prototype.loadTestData = function (callback) {

	async.map([{
			"_id": "567ae73c817bd7005fd101ce",
			"desc": "",
			"classId": "180HN",
			"prettyUrl": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_course_detail?cat_term_in=201602&subj_code_in=PEAC&crse_numb_in=180HN",
			"name": "Thesis Peace",
			"url": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?term_in=201602&subj_in=PEAC&crse_in=180HN&schd_in=%25",
			"host": "swarthmore.edu",
			"termId": "201602",
			"subject": "PEAC",
			"crns": [],
			"lastUpdateTime": 1450895164551,
			"deps": {},
			"updatedByParent": false
		}],
		function (classData, callback) {
			this.table.insert(classData, function (err, newDoc) {
				callback(err)
			}.bind(this))
		}.bind(this),
		function (err) {
			if (err) {
				console.log('error inserting in load test data in classesdb??')
				return callback(err);
			}

			callback()
		}.bind(this))
};

ClassesDB.prototype.tests = function (callback) {
	console.log('running classes tests')


	this.updateDatabase({
			"_id": "567ae73c817bd7005fd101ce",
			"desc": "",
			"classId": "180HN",
			"prettyUrl": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_course_detail?cat_term_in=201602&subj_code_in=PEAC&crse_numb_in=180HN",
			"name": "Thesis Peace",
			"url": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?term_in=201602&subj_in=PEAC&crse_in=180HN&schd_in=%25",
			"host": "swarthmore.edu",
			"termId": "201602",
			"subject": "PEAC",
			"crns": [],
			"lastUpdateTime": 1450895164555, //changed this
			"deps": {},
			"updatedByParent": false
		}, {

			"_id": "567ae73c817bd7005fd101ce",
			"desc": "",
			"classId": "180HN",
			"prettyUrl": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_course_detail?cat_term_in=201602&subj_code_in=PEAC&crse_numb_in=180HN",
			"name": "Thesis Peace",
			"url": "https://myswat.swarthmore.edu/pls/bwckctlg.p_disp_listcrse?term_in=201602&subj_in=PEAC&crse_in=180HN&schd_in=%25",
			"host": "swarthmore.edu",
			"termId": "201602",
			"subject": "PEAC",
			"crns": ['hiii'], //also changed this
			"lastUpdateTime": 1450895164551,
			"deps": {},
			"updatedByParent": false

		},
		function (err) {
			callback()
		}.bind(this))

};


ClassesDB.prototype.ClassesDB = ClassesDB;
module.exports = new ClassesDB();


if (require.main === module) {
	module.exports.tests();
}