'use strict';
var macros = require('./macros')
var BaseData = require('./BaseData');
var Term = require('./Term');


function Host(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	//populated on .loadSubjects
	this.terms = []

}

macros.inherent(BaseData, Host)

Host.requiredPath = []
Host.optionalPath = ['host']
Host.API_ENDPOINT = '/listColleges'


Host.prototype.loadTerms = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Term.createMany(this.getIdentifer().full.obj, function (err, terms) {
			if (err) {
				return callback(err)
			}

			this.terms = terms
			callback()

		}.bind(this))
	}.bind(this))
};

module.exports = Host