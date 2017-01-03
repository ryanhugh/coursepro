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
var macros = require('../backend/macros')
var collegeNamesDB = require('../backend/databases/collegeNamesDB')
var termsDB = require('../backend/databases/termsDB')
var classesDB = require('../backend/databases/classesDB')
var linksDB = require('../backend/databases/linksDB')
var sectionsDB = require('../backend/databases/sectionsDB')
var subjectsDB = require('../backend/databases/subjectsDB')
var userDB = require('../backend/databases/usersDB')



// userDB.table.remove({},function (err, i) {
// 	console.log("done user db");
// }.bind(this))


// process.exit()

if (macros.PRODUCTION) {
	fjdsklajfdsjkljlkjl
	console.log("NOOOOOO");
	process.exit()
}
var toClear = [collegeNamesDB, termsDB, classesDB, linksDB, sectionsDB, subjectsDB]

toClear.forEach(function (db) {
	db.table.remove({host:'brown.edu'}, function (err, i) {
		console.log(err, db.tableName);
	}.bind(this))
}.bind(this))

// var usersDB = require('./backend/databases/usersDB')

// usersDB.table.remove({_id:'570f28c3be6973c0b2de6620'},function (err, a) {
// 	console.log(err, a);
// }.bind(this))
