'use strict';

var request = require('./request')

function User() {

	//all the data on the db schema for users is copied to this object
	//but use getters so can download if need to

	this.onAuthenticateTriggers = []
}


//getters and setters for localStorage stuff
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


//fired when authenticated
User.prototype.onAuthenticate = function (name, trigger) {
	//lol just fire it now
	if (this.getAuthenticated()) {
		trigger();
		return;
	}
	else {

		this.onAuthenticateTriggers.push({
			name: name,
			trigger: trigger
		})

	}

};
User.prototype.removeTriggers = function (name) {
	var triggersToRemove = _.where(this.onAuthenticateTriggers, {
		name: name
	})

	triggersToRemove.forEach(function (trigger) {
		_.pull(this.onAuthenticateTriggers, trigger)
	}.bind(this))
};


//this is called direcly from the signed in with google.js
User.prototype.signedInWithGoogle = function (err, googleUser) {
	if (err) {
		console.log("ERROR", err);

		//call all the callbacks
		this.onAuthenticateTriggers.forEach(function (trigger) {
			trigger.trigger(err);
		}.bind(this))

		//keep the callbacks when error

		return;
	};


	var profile = googleUser.getBasicProfile();
	this.setEmail(profile.getEmail())

	request({
		url: '/getUser',
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
			trigger.trigger();
		}.bind(this))

		//remove all triggers on success
		this.onAuthenticateTriggers = []


	}.bind(this))
}

//download user data
User.prototype.download = function (callback) {
	if (!this.getAuthenticated()) {
		console.log("ERROR not authenticated cant get user data");
		return callback('Cannot get user data without being signed in')
	};

	request({
		url: '/getUser',
		type: 'POST',
		auth: true
	}, function (err, user) {
		if (err) {
			console.log('ERROR', err)
			return callback(err)
		}

		//copy the attrs to this
		for (var attrName in user) {
			if (this[attrName] != user[attrName] && this[attrName] !== undefined) {
				console.log("ERROR overrideing value", attrName, this[attrName], user[attrName]);
			}
			this[attrName] = user[attrName]
		}


		return callback(null, this)
	}.bind(this))
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
			console.log(err, response);
			return callback('Error :/');
		}


		else {
			console.log('it worked!')
			return callback(null, 'Success!');
		}

	}.bind(this))
};


//watch classes

User.prototype.sendRequest = function (url, tree, callback) {
	if (!callback) {
		callback = function () {}
	};

	request({
		url: url,
		type: 'POST',
		useCache: false,
		auth: true,
		body: tree.getIdentifer()
	}, function (err, response) {
		if (err) {
			console.log('ERROR', err)
			return callback(err);
		}

		if (response.error) {
			console.log('ERROR look at the server logs', response)
			return callback(response.msg)
		}
		else {
			return callback(null, response.msg)
		}

	}.bind(this))
};

//sends post reque
User.prototype.addClassToWatchList = function (tree, callback) {
	this.sendRequest('/addClassToWatchList', tree, callback)
};


User.prototype.removeClassFromWatchList = function (tree, callback) {
	this.sendRequest('/removeClassFromWatchList', tree, callback)
};



User.prototype.User = User;
module.exports = new User();