'use strict';
var macros = require('./macros')
var request = require('./request')
var BaseData = require('./BaseData');
var Class = require('./Class');


function Term(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	//populated on .loadSubjects
	this.subjects = []

}

macros.inherent(BaseData, Term)

Term.prototype.requiredPath = ['host']
Term.prototype.optionalPath = ['termId']
Term.prototype.API_ENDPOINT = '/listTerms'


Term.prototype.loadSubjects = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Subject.createMany(this, function (err, subjects) {
			if (err) {
				return callback(err)
			}

			this.subjects = subjects

		}.bind(this))
	}.bind(this))
};

module.exports = Term