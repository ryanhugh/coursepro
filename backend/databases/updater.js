/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

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
	if (macros.PRODUCTION || 1) {
		this.onInterval();
	};

	if (!macros.UNIT_TESTS) {
		//30 min
		setInterval(this.onInterval.bind(this), macros.DB_REFRESH_INTERVAL)
	}
}


//update all classes that are being watched
Updater.prototype.onInterval = function () {

	usersDB.getUsersWatchCache(function (err, classWatchCache) {
		if (err) {
			console.log("ERROR", err);
			return;
		};

		var classIds = _.keys(classWatchCache.classes)

		console.log("updating ", classIds.length, ' classes', JSON.stringify(classIds));

		if (classIds.length === 0) {
			return;
		}

		var pageDatas = []

		for (var classMongoId in classWatchCache.classes) {
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

			pageDatas.push(pageData)
		}

		pageDataMgr.go(pageDatas, function (err, pageData) {
			if (err) {
				elog('Error updating classes on setInterval!',err)
			}
			else {
				console.log("Done running onInterval");
			}
		}.bind(this))
	}.bind(this))
};



Updater.prototype.Updater = Updater;
module.exports = new Updater();
