'use strict';
var macros = require('../macros')
var BaseData = require('./BaseData');
var Class = require('./Class');


function Subject(config) {
	BaseData.prototype.constructor.apply(this, arguments);

	if (config.subject && config.text) {
		this.dataStatus = macros.DATASTATUS_DONE;
	};

	//populated on .loadClasses
	this.classes = []

}

macros.inherent(BaseData, Subject)

Subject.requiredPath = ['host', 'termId']
Subject.optionalPath = ['subject']
Subject.API_ENDPOINT = '/listSubjects'


Subject.prototype.loadClasses = function (callback) {
	this.download(function (err) {
		if (err) {
			return callback(err)
		}

		Class.createMany(this.getIdentifer().full.obj, function (err, classes) {
			if (err) {
				return callback(err)
			}

			this.classes = classes
			callback()

		}.bind(this))
	}.bind(this))
};


Subject.prototype.compareTo = function(other) {
	if (this.subject<other.subject) {
		return -1;
	}
	else if (this.subject>other.subject) {
		return 1;
	}
	else {
		elog("subjects are same??",this,other);
		return 0;
	}
};


module.exports = Subject