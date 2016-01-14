'use strict';

var request = require('./request')

function User() {


	this.onAuthenticateTriggers = []
}

User.prototype.signedInWithGoogle = function (err, googleUser) {
	if (err) {
		console.log("ERROR", err);

		//call all the callbacks
		this.onAuthenticateTriggers.forEach(function (trigger) {
			trigger(err);
		}.bind(this))

		return;
	};


	var profile = googleUser.getBasicProfile();
	this.setEmail(profile.getEmail())

	request({
		url: '/authenticateUser',
		body: {
			idToken: googleUser.getAuthResponse().id_token
		}
	}, function (err, response) {
		if (err) {
			console.log('ERROR', err)
			return;
		}

		if (!response.loginKey) {
			console.log("didn't get a login key?", response, err)
			return;
		}

		localStorage.loginKey = response.loginKey

		//call all the callbacks
		this.onAuthenticateTriggers.forEach(function (trigger) {
			trigger();
		}.bind(this))
		

	}.bind(this))
}

//this isnt used rn lol
User.prototype.onAuthenticate = function (trigger) {
	this.onAuthenticateTriggers.push(trigger)
};


User.prototype.getAuthenticated = function () {
	if (localStorage.loginKey) {
		return true;
	}
	else {
		return false;
	}
};


User.prototype.getUserData = function () {
	if (!localStorage.userData) {
		return {};
	}

	return JSON.parse(localStorage.userData)
};
User.prototype.setUserData = function (userData) {
	localStorage.userData = JSON.stringify(userData)
};

User.prototype.getEmail = function () {
	return this.getUserData().email;
};

User.prototype.setEmail = function (email) {
	var userData = this.getUserData()
	userData.email = email;
	this.setUserData(userData);
};




// http://stackoverflow.com/a/46181/11236
// this is also done client side
User.prototype.validateEmail = function (email) {
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


User.prototype.subscribeForNews = function (email, callback) {

	if (!this.validateEmail(email)) {
		console.log(email, 'is not an email address!');

		//show some warning in the html
		return callback('Invalid email, try again');
	}

 
	console.log('email submitted:', email);

	request({
		url: '/registerForEmails',
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


User.prototype.User = User;
module.exports = new User();