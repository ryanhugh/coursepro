'use strict';
var _ = require('lodash')

var usersDB = require('./usersDB')
var classesDB = require('./classesDB')
var PageData = require('../PageData')
var macros = require('../macros')



function Updater() {

	//don't run when spidering
	if (macros.SPIDER) {
		return;
	}

	//run updater on boot if in production
	if (macros.PRODUCTION) {
		this.onInterval();
	};

	if (!macros.UNIT_TESTS && 0) {
		//30 min
		setInterval(this.onInterval.bind(this), macros.DB_REFRESH_INTERVAL)
	}
}

Updater.prototype.updateClassFromMongoId = function (classMongoId, callback) {
	if (!callback) {
		callback = function () {}
	};

	var pageData = PageData.create({
		dbData: {
			_id: classMongoId

		}
	})

	if (!pageData) {
		console.log('ERROR unable to create page data with _id of ', classMongoId, '????')
		return callback('error')
	}
	pageData.database = classesDB;

	pageDataMgr.go(pageData, function (err, pageData) {
		callback(err)

	}.bind(this))
};

//update all classes that are being watched
Updater.prototype.onInterval = function () {

	usersDB.getUsersWatchCache(function (err, classWatchCache) {
		if (err) {
			console.log("ERROR", err);
			return;
		};

		var classIds = _.keys(classWatchCache.classes)

		console.log("updating ", classIds.length, ' classes', classIds);

		for (var classMongoId in classWatchCache.classes) {

			this.updateClassFromMongoId(classMongoId)

		}
	}.bind(this))
};



Updater.prototype.Updater = Updater;
module.exports = new Updater();
