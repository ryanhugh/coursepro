'use strict';
var macros = require('./macros')
var request = require('./request')
var BaseData = require('./BaseData');
var Subject = require('./Subject');


function Term(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	//populated on .loadSubjects
	this.subjects = []

	// console.log(config);
	this.host = config.host
	this.termId = config.termId

}

macros.inherent(BaseData, Term)

Term.requiredPath = ['host']
Term.optionalPath = ['termId']
Term.API_ENDPOINT = '/listTerms'


Term.prototype.loadSubjects = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Subject.createMany(this.getIdentifer().full.obj, function (err, subjects) {
			if (err) {
				return callback(err)
			}
			subjects.sort(function (a,b) {
				return a.compareTo(b)
			}.bind(this))

			this.subjects = subjects
			callback()

		}.bind(this))
	}.bind(this))
};

module.exports = Term