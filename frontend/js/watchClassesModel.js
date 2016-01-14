'use strict';
var request = require('./request')

var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')


function WatchClassesModel($scope, tree) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.model = this;

	//the current class being watched
	this.tree = tree;


	if (localStorage.loginKey) {
		this.addClassToWatchList()
	}
	//if not the google sign in button will appear

	$scope.$on('googleSignIn', function (event, data) {
		this.onSignIn(data.err, data.googleUser)
	}.bind(this))


	this.msg = ''
}

//called from controllers wanting to make and instance of this
WatchClassesModel.getOpenDetails = function (tree) {
	return {
		animation: true,
		templateUrl: directiveMgr.getHTMLPathFromClass(WatchClassesModel),
		controller: WatchClassesModel,
		resolve: {
			tree: tree
		}
	}
}

WatchClassesModel.prototype.getSignedIn = function () {
	if (localStorage.loginKey) {
		return true;
	}
	else {
		return false;
	}
};


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

		this.error = false;

		if (response.error) {
			console.log('ERROR look at the server logs', response)
			this.msg = response.msg
			this.error = true;
		}
		else if (this.tree.name) {
			this.msg = 'Successfully registered for updates on ' + this.tree.name + '!'
		}
		else {
			this.msg = 'Successfully registered for updates!'
		}

		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)

	}.bind(this))
};


WatchClassesModel.prototype.removeClassFromWatchList = function() {
	
		document.getElementById('RemoveWatchListId').onclick = function () {
			request({
				url: '/removeClassFromWatchList',
				useCache: false,
				auth: true,
				body: {
					host: this.tree.host,
					termId: this.tree.termId,
					subject: this.tree.subject,
					classId: this.tree.classId
				}
			},function (err,response) {
				document.getElementById('RemoveWatchListId').style.display = 'none'

				var string = '';
				if (err) {
					string = 'There was an error removing from the database :/'
					console.log(string)
				}
				else if (response && response.msg) {
					string = response.msg
				}
				else {
					string = 'done'
				}

				document.getElementById('unsubscribeDoneId').style.display = ''
				document.getElementById('unsubscribeDoneId').innerHTML = ' ' +string
			}.bind(this))
		}.bind(this)

};

WatchClassesModel.prototype.onSignIn = function (err, googleUser) {
	if (err) {
		console.log("ERROR", err);
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

		this.addClassToWatchList()

	}.bind(this))
}

WatchClassesModel.prototype.WatchClassesModel = WatchClassesModel;
module.exports = WatchClassesModel;
directiveMgr.addRawController(WatchClassesModel)