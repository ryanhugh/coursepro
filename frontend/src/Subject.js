'use strict';
var macros = require('./macros')
var request = require('./request')
var BaseData = require('./BaseData');
var Class = require('./Class');


function Subject(config) {
	BaseData.prototype.constructor.apply(this, arguments);

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

		Class.createMany(this, function (err, classes) {
			if (err) {
				return callback(err)
			}

			this.classes = classes

		}.bind(this))
	}.bind(this))
};

module.exports = Subject