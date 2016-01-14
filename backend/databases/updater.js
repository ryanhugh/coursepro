'use strict';

var usersDB = require('./usersDB')
var classesDB = require('./classesDB')

var macros = require('../macros')



function Updater() {

	// this.onInterval();

	//30 min
	setInterval(this.onInterval.bind(this), macros.DB_REFRESH_INTERVAL)
}

Updater.prototype.updateClassFromMongoId = function (classMongoId, callback) {
	if (!callback) {
		callback = function () {}
	};

	var pageData = pageDataMgr.create({
		dbData: {
			_id: classMongoId

		}
	})

	if (!pageData) {
		console.log('ERROR unable to create page data with _id of ', classMongoId, '????')
		return callback('error')
	}
	pageData.database = classesDB;

	pageData.loadFromDB(function (err) {
		if (err) {
			console.log('error loading from db??', err)
			return;
		}

		// console.log('done top level pagedata fetching from db ', pageData)
			//updatedByParent:true
		if (!pageData.dbData.url || pageData.dbData.updatedByParent) {
			console.log('does not have url or updated by parent, skipping', pageData.dbData._id)
			return callback('skipping class that is updated by parent, fetch that _id to update');
		};


		pageDataMgr.go(pageData, function (err, pageData) {
			callback(err)
		}.bind(this));

	}.bind(this))
};

//update all classes that are being watched
Updater.prototype.onInterval = function () {
	console.log('updater running!')

	usersDB.getUsersWatchCache(function (err, classWatchCache) {
		if (err) {
			console.log("ERROR",err);
			return;
		};

		for (var classMongoId in classWatchCache.classes) {
			console.log('updating class', classMongoId)

			this.updateClassFromMongoId(classMongoId)

		}
	}.bind(this))
};



Updater.prototype.Updater = Updater;
module.exports = new Updater();