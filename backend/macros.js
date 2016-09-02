'use strict';
var fs = require('fs')
var _ = require('lodash')
var commonMacros = require('../common/macros')



function Macros() {
	commonMacros.Macros.prototype.constructor.apply(this, arguments);



	//change the current working directory to the directory with package.json
	//gulp does this automatically too, but it is not ran on 'node file.js'
	while (1) {
		try {
			fs.statSync('.git');
		}
		catch (e) {

			//cd .. until in the same dir as package.json, the root of the project
			process.chdir('..');
			continue;
		}
		break;
	}



	// set up elog
	global.elog = function () {
		console.log.apply(console, arguments)
		console.log(new Error('elog Trace').stack)
	}.bind(this)



	// Set up macros.PRODUCTION, macros.DEVELOPMENT, etc
	var mode;
	process.argv.slice(2).forEach(function (command) {
		if (!mode) {
			mode = command;
			return;
		}

		if (command.startsWith('-')) {
			return;
		}

		else if (_(mode).endsWith('test') && _(command).endsWith('test')) {
			return;
		}
		else {
			// cannot be both macros.PRODUCTION and macros.DEVELOPMENT, etc
			// run in mutltiple terminals (separate gulp processes) for this to work
			console.log(mode, command);
			elog('Cannot run multiple commands at the same time, cant be both macros.DEVELOPMENT and macros.UNIT_TESTS, etc!!!!')
			process.exit()
		}

	}.bind(this))

	//there are three modes this can be ran in
	//prod (macros.PRODUCTION and db = coursepro_prod) gulp prod
	//dev (macros.DEVELOPMENT and db = coursepro_dev) gulp dev and gulp spider
	//UNIT_TESTS (macros.UNIT_TESTS and db = coursepro_tests) gulp tests and node file.js
	if (process.title == 'gulp') {
		var command = process.argv[2];


		if (command === 'prod') {
			this.PRODUCTION = true;
		}
		else if (command === 'dev' || command === 'spider') {
			this.DEVELOPMENT = true;
			if (command == 'spider') {
				this.SPIDER = true;
			}
		}
		else if (_(command).includes('test') && command != 'testAllGraphs') {
			this.UNIT_TESTS = true;
		}
		else {
			console.log('WARNING Unknown GULP mode ', command, process.argv)
			console.log('this is from b macros.js')
			console.log('setting to DEVELOPMENT mode!')
			this.DEVELOPMENT = true;
		}
	}
	else {
		console.log("Not running from gulp, setting to dev mode")
		this.DEVELOPMENT = true;
	}


	//Set all the stuff that wasen't set to false
	if (this.PRODUCTION === undefined) {
		this.PRODUCTION = false
	}
	if (this.DEVELOPMENT === undefined) {
		this.DEVELOPMENT = false
	}
	if (this.SPIDER === undefined) {
		this.SPIDER = false
	}
	if (this.UNIT_TESTS === undefined) {
		this.UNIT_TESTS = false;
	}






	//setup database ip and mongo db name
	var databaseIp = '52.20.189.150'


	var databaseName = null;

	if (this.PRODUCTION) {
		databaseName = 'coursepro_prod'
	}
	else if (this.DEVELOPMENT) {
		databaseName = 'coursepro_dev'
	}
	else if (this.UNIT_TESTS) {
		databaseName = 'coursepro_tests'
		databaseName = 'coursepro_dev'
	}

	this.DATABASE_URL = databaseIp + '/' + databaseName;





	//if a page data is newer that this, there is a cache hit 
	//ms
	// this.OLD_PAGEDATA = 300000
	this.OLD_PAGEDATA = 1500


	//enable or disable sending emails
	//by default, only send if in PRODUCTION
	if (this.PRODUCTION) {
		this.SEND_EMAILS = true;
		this.QUIET_LOGGING = true;

		//so express dosent spit out trace backs to the user
		process.env.NODE_ENV = 'production';
	}
	else {
		this.SEND_EMAILS = false
		this.QUIET_LOGGING = false;
	}

	// don't spit out a lot of stuff in normal mode
	if (this.SPIDER) {
		this.QUIET_LOGGING = false;
	}
	else {
		this.QUIET_LOGGING = true;

	}



	// this.SEND_EMAILS = true;



	this.VERBOSE = false;
}


commonMacros.inherent(commonMacros.Macros, Macros)


module.exports = new Macros();