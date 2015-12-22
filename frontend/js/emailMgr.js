'use strict';
var request = require('./request')

function EmailMgr() {
	this.emailError = document.getElementById('emailErrorId')
	this.emailSuccess = document.getElementById('emailSuccessId')

	this.submitButton = document.getElementById('emailSubmitButtonId')

	this.submitButton.onclick = this.onEmailSubmit.bind(this);

}


// http://stackoverflow.com/a/46181/11236
// this is also done client side
EmailMgr.prototype.validateEmail = function(email) {
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



EmailMgr.prototype.submitTo = function(url, callback) {


	var box = document.getElementById('emailBoxId');
	var email = box.value.trim();

	if (!this.validateEmail(email)) {
		console.log(email, 'is not an email address!');

		//show some warning in the html
		return callback('invalid email');
	}


	console.log('email submitted:', email);

	request({
		url: url,
		body: {
			email: email
		}
	}, function(err, response) {
		if (err) {

			//server error, probably will not happen but can be a bunch of different stuff
			console.log(err);
			return callback('error');
		}

		else if (response.error) {

			//some other errors are possible - same thing as above
			console.log(response.error)
			return callback('error');
		}

		else {
			console.log('it worked!')
			return callback();
		}

	}.bind(this))
};



EmailMgr.prototype.onEmailSubmit = function(email) {

	this.submitTo('/registerForEmails', function(err) {

		if (err == 'invalid email') {
			this.emailError.style.display = '';
			this.emailError.innerHTML = 'Invalid email, try again';
			this.emailSuccess.style.display = 'none';
		}
		else if (err) {
			this.emailError.innerHTML = 'Error :/';
			this.emailError.style.display = '';
			this.emailSuccess.style.display = 'none';
		}
		else {
			this.emailSuccess.style.display = '';
			this.emailError.style.display = 'none';
		}
	}.bind(this))

}


EmailMgr.prototype.EmailMgr = EmailMgr;
module.exports = new EmailMgr();