'use strict';
var request = require('./request')

function WatchClassesModel() {

	this.modelBody = document.getElementById('watchClassesModelBodyId')

	//the current class being watched
	this.tree = null;
}

WatchClassesModel.prototype.getUserData = function () {
	if (!localStorage.userData) {
		return {};
	}

	return JSON.parse(localStorage.userData)
};
WatchClassesModel.prototype.setUserData = function (userData) {
	localStorage.userData = JSON.stringify(userData)
};

WatchClassesModel.prototype.getEmail = function () {
	return this.getUserData().email;
};

WatchClassesModel.prototype.setEmail = function (email) {
	var userData = this.getUserData()
	userData.email = email;
	this.setUserData(userData);
};


//sends post reque
WatchClassesModel.prototype.addClassToWatchList = function () {

	request({
		url: '/addClassToWatchList',
		useCache: false,
		auth: true,
		body: {
			host: this.tree.host,
			termId: this.tree.termId,
			subject: this.tree.subject,
			classId: this.tree.classId
		}
	}, function (err, response) {
		if (err) {
			console.log('ERROR', err)
			return;
		}

		var bodyText = [];

		bodyText.push('<div style=\"font-weight:bold;\">');


		if (response.error) {
			console.log('ERROR look at the server logs', response)
			bodyText.push(response.msg)
		}
		else if (this.tree.name) {
			bodyText.push('Successfully registered for updates on ' + this.tree.name + '!')
		}
		else {
			bodyText.push('Successfully registered for updates!')
		}
		bodyText.push('</div>')
		bodyText.push('<br>')

		var email = this.getEmail()
		if (email) {
			bodyText.push("Update emails will be sent to ")
			bodyText.push('<span style=\"font-weight:bold;\">');
			bodyText.push(email)
			bodyText.push('</span>')
		};
		if (!response.error) {
			bodyText.push("We'll send you an email if anything changes in the class or any of the sections!<br>")
		};

		this.modelBody.innerHTML = bodyText.join('')

	}.bind(this))

};

WatchClassesModel.prototype.onSignIn = function (googleUser) {

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

		this.addClassToWatchList()

	}.bind(this))
}


//this is called from anelBody).find('.linkToClassWatchModel').on('click',fun
// in popup.js TODO change to angular
WatchClassesModel.prototype.go = function (tree) {

	this.tree = tree;

	//bring up google sign in if your not signed in with google
	if (!localStorage.loginKey) {
		var bodyText = [];

		bodyText.push('<div style=\"font-weight:bold;\">Sign in with Google!</div>')
		bodyText.push("(If you can't see the button below, try disabling any browser extention that might block external scripts from google).")
		bodyText.push('<div id="signInWithGoogleButtonId" style="display: table;padding-top: 17px;"></div>')

		this.modelBody.innerHTML = bodyText.join('')

		gapi.signin2.render('signInWithGoogleButtonId', {
			onsuccess: this.onSignIn.bind(this),
			onfailure: function () {
				console.log('Error signing in with google')
			}.bind(this)
		});

		return;
	}
	//if you are, send the post req	
	else {
		this.addClassToWatchList()
	}



};



WatchClassesModel.prototype.WatchClassesModel = WatchClassesModel;
module.exports = new WatchClassesModel();