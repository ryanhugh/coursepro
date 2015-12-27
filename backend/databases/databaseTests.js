'use strict';
var _ = require('lodash')
var queue = require('queue-async')
var async = require('async')

var usersDB = require('./usersDB')
var classesDB = require('./classesDB')
var sectionsDB = require('./sectionsDB')


function DatabaseTests() {
	this.databases = [usersDB, classesDB, sectionsDB]
}



DatabaseTests.prototype.go = function () {


	async.waterfall([
			function (callback) {


				//switch all the databases to test mode (which clears contents)
				async.map(
					this.databases,
					function (database, callback) {
						database.switchToTestsDB(callback)
					}.bind(this),
					function (err) {
						callback(err)
					});



			}.bind(this),
			function (callback) {

				//then load the test data in all the databases
				async.map(
					this.databases,
					function (database, callback) {
						database.loadTestData(callback)
					}.bind(this),
					function (err, results) {
						callback(err)
					});
			}.bind(this)
		],
		function (err) {

			async.map(
				this.databases,

				function (database, callback) {
					database.tests(callback)
				}.bind(this),

				function (err) {
					setTimeout(function () {

						usersDB.close()
					}.bind(this), 1000)
				});



			//all the databases share the same connection
			//so .close on any of them will close them all

			//also, updateDatabase for both classes and sections
			//check to see if someone needs be notified async, 
			//and calls callback before they are all done


			//now run the tests


		}.bind(this))
}



DatabaseTests.prototype.DatabaseTests = DatabaseTests;
module.exports = new DatabaseTests();


if (require.main === module) {
	module.exports.go();
}