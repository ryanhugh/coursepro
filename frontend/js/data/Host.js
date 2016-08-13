'use strict';
var macros = require('../macros')
var BaseData = require('./BaseData');
var Term = require('./Term');
var Keys = require('../../../common/Keys')


function Host(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	//populated on .loadSubjects
	this.terms = []
	
	this.dataStatus = macros.DATASTATUS_NOTSTARTED;
}

macros.inherent(BaseData, Host)

Host.requiredPath = []
Host.optionalPath = ['host']
Host.API_ENDPOINT = '/listColleges'
Host.bypassResultsCache = true;


Host.prototype.loadTerms = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Term.createMany(Keys.create(this), function (err, terms) {
			if (err) {
				return callback(err)
			}

			this.terms = terms
			callback()

		}.bind(this))
	}.bind(this))
};

// Sort by title, and then by host
Host.prototype.compareTo = function(other){
	if (other.title < this.title) {
		return 1;
	}
	else if (other.title > this.title) {
		return -1;
	}
	else if (other.host < this.host) {
		return 1;
	}
	else if (other.host > this.host) {
		return -1;
	}
	else {
		elog('comparing to a Host that is identical to this one??')
		return 0;
	}
}

module.exports = Host