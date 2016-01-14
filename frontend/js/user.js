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



User.prototype.User = User;
module.exports = new User();