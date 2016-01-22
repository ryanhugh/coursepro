'use strict';
var macros = require('./macros')
var request = require('./request')
var BaseData = require('./BaseData');
var Term = require('./Term');


function Host(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	//populated on .loadSubjects
	this.terms = []

}

macros.inherent(BaseData, Host)

Host.prototype.requiredPath = []
Host.prototype.optionalPath = ['host']
Host.prototype.API_ENDPOINT = '/listColleges'


Host.prototype.loadTerms = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Term.createMany(this, function (err, terms) {
			if (err) {
				return callback(err)
			}

			this.terms = terms

		}.bind(this))
	}.bind(this))
};

module.exports = Host