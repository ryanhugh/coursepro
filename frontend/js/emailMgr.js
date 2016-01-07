'use strict';
var request = require('./request')

function EmailMgr() {

}


// http://stackoverflow.com/a/46181/11236
// this is also done client side
EmailMgr.prototype.validateEmail = function (email) {
	if (!email) {
		return false;
	};

	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	if (!re.test(email)) {
		console.log('email failed regex', email)
		return false;
	}

	return true;
}



EmailMgr.prototype.submitTo = function (url, email, callback) {

	if (!this.validateEmail(email)) {
		console.log(email, 'is not an email address!');

		//show some warning in the html
		return callback('Invalid email, try again');
	}


	console.log('email submitted:', email);

	request({
		url: url,
		auth: true,
		body: {
			email: email
		}
	}, function (err, response) {
		//some other errors are possible - same thing as above
		if (err || response.error) {

			//server error, probably will not happen but can be a bunch of different stuff
			console.log(err,response);
			return callback('Error :/');
		}


		else {
			console.log('it worked!')
			return callback(null, 'Success!');
		}

	}.bind(this))
};



EmailMgr.prototype.subscribe = function (email, callback) {
	this.submitTo('/registerForEmails', email, callback)
}


EmailMgr.prototype.EmailMgr = EmailMgr;
module.exports = new EmailMgr();