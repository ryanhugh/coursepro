var macros = require('./backend/macros')
var collegeNamesDB = require('./backend/databases/collegeNamesDB')
var termsDB = require('./backend/databases/termsDB')
var classesDB = require('./backend/databases/classesDB')
var linksDB = require('./backend/databases/linksDB')
var sectionsDB = require('./backend/databases/sectionsDB')
var subjectsDB = require('./backend/databases/subjectsDB')


if (macros.PRODUCTION) {
	fjdsklajfdsjkljlkjl
}
var toClear = [collegeNamesDB, termsDB, classesDB, linksDB, sectionsDB, subjectsDB]

toClear.forEach(function (db) {
	db.table.remove({}, function (err, i) {
		console.log(err, i, db);
	}.bind(this))
}.bind(this))

// var usersDB = require('./backend/databases/usersDB')

// usersDB.table.remove({_id:'570f28c3be6973c0b2de6620'},function (err, a) {
// 	console.log(err, a);
// }.bind(this))
