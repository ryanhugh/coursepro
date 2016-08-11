'use strict';
var macros = require('../macros')
var BaseData = require('./BaseData');
var Subject = require('./Subject');


function Term(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	//populated on .loadSubjects
	this.subjects = []

	this.host = config.host
	this.termId = config.termId
}

macros.inherent(BaseData, Term)

Term.requiredPath = ['host']
Term.optionalPath = ['termId']
Term.API_ENDPOINT = '/listTerms'
Term.bypassResultsCache = true;


Term.prototype.loadSubjects = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Subject.createMany(this.getIdentifer().full.obj, function (err, subjects) {
			if (err) {
				return callback(err)
			}

			this.subjects = subjects
			callback()

		}.bind(this))
	}.bind(this))
};


// Sort by title, and then by host
Term.prototype.compareTo = function(other){
	var thisParsed = parseInt(this.termId)
	var otherParsed = parseInt(other.termId)

	if (thisParsed < otherParsed) {
		return 1;
	}
	else if (thisParsed > otherParsed) {
		return -1;
	}
	else {
		elog('two terms had the same id ???',this, other);
		return 0;
	}
}


module.exports = Term