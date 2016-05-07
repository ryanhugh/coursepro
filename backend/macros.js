'use strict';
var fs = require('fs')


//change the current working directory to the directory with package.json
//gulp does this automatically too, but it is not ran on 'node file.js'
function fixCWD() {


	while (1) {
		try {
			fs.statSync('.git');
		}
		catch (e) {

			//cd .. until in the same dir as package.json, the root of the project
			process.chdir('..');
			continue;
		}
		return;
	}
}
fixCWD();

global.elog = function () {
	console.log.apply(console,arguments)
	console.log(new Error('elog Trace').stack)
}.bind(this)


//setup different targets
function setupTargetStates() {

	//there are three modes this can be ran in
	//prod (macros.PRODUCTION and db = coursepro_prod) gulp prod
	//dev (macros.DEVELOPMENT and db = coursepro_dev) gulp dev and gulp spider
	//UNIT_TESTS (macros.UNIT_TESTS and db = coursepro_tests) gulp tests and node file.js
	if (process.title == 'gulp') {
		var command = process.argv[2];


		if (command === 'prod') {
			exports.PRODUCTION = true;
			return;
		}
		else if (command === 'dev' || command === 'spider') {
			exports.DEVELOPMENT = true;
			if (command == 'spider') {
				exports.SPIDER = true;
			};
			return
		}
		else if (command === 'ftest' || command === 'btest') {
			exports.UNIT_TESTS = true;
		}
		else {
			console.log('WARNING Unknown GULP mode ', command, process.argv)
			console.log('this is from b macros.js')
			console.log('setting to DEVELOPMENT mode!')
			exports.DEVELOPMENT = true;
		}
	}
	else {
		exports.UNIT_TESTS = true;
		return;
	}
}
setupTargetStates()

//setup database ip and mongo db name
var databaseIp = '52.20.189.150'


var databaseName = null;

if (exports.PRODUCTION) {
	databaseName = 'coursepro_prod'
}
else if (exports.DEVELOPMENT) {
	databaseName = 'coursepro_dev'
}
else if (exports.UNIT_TESTS) {
	databaseName = 'coursepro_tests'
	databaseName = 'coursepro_dev'
}

exports.DATABASE_URL = databaseIp + '/' + databaseName;



//if a page data is newer that this, there is a cache hit 
//ms
// exports.OLD_PAGEDATA = 300000
exports.OLD_PAGEDATA = 1500


// 30 min
// interval for a updater.js
// if this is changed also change the description in WatchClassesModel.js
exports.DB_REFRESH_INTERVAL = 1800000
// exports.DB_REFRESH_INTERVAL = 300000




//enable or disable sending emails
//by default, only send if in PRODUCTION
if (exports.PRODUCTION) {
	exports.SEND_EMAILS = true;
	exports.QUIET_LOGGING = true;

	//so express dosent spit out trace backs to the user
	process.env.NODE_ENV='production';
}
else {
	exports.SEND_EMAILS = false
	exports.QUIET_LOGGING = false;
}

// don't spit out a lot of stuff in normal mode
if (exports.SPIDER) {
	exports.QUIET_LOGGING = false;
}
else {
	exports.QUIET_LOGGING = true;
	
}



// exports.SEND_EMAILS = true;



exports.VERBOSE = false;