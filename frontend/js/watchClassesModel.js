'use strict';
var request = require('./request')

var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')


function WatchClassesModel($scope, $uibModalInstance, $timeout, tree) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.model = this;
	this.$uibModalInstance = $uibModalInstance

	//the current class being watched
	this.tree = tree;


	//if not the google sign in button will appear

	$scope.$on('googleSignIn', function (event, data) {
		this.onSignIn(data.err, data.googleUser)
	}.bind(this))


	this.subscribeMsg = ''
	this.unsubscribeMsg = ''

	// if signed in, don't show the model until the request is done 
	// this prevents a flickering of something before the request comes back
	if (localStorage.loginKey) {
		this.addClassToWatchList(function () {
			$timeout(function () {
				this.doneRendering = true;
			}.bind(this))
		}.bind(this))
	}
	
	//else just show it
	else {
		this.doneRendering = true;
	}

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


WatchClassesModel.prototype.sendRequest = function (url, callback) {
	request({
		url: url,
		type: 'POST',
		useCache: false,
		auth: true,
		tree: this.tree
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
WatchClassesModel.prototype.addClassToWatchList = function (callback) {
	this.sendRequest('/addClassToWatchList', function (err, msg) {

		this.error = false;

		if (err) {
			this.error = true;
			this.subscribeMsg = err;
		}
		else if (this.tree.name) {
			this.subscribeMsg = 'Successfully registered for updates on ' + this.tree.name + '!'
		}
		else {
			this.subscribeMsg = 'Successfully registered for updates!'
		}
		callback()

	}.bind(this))

};


WatchClassesModel.prototype.removeClassFromWatchList = function () {
	this.sendRequest('/removeClassFromWatchList', function (err, msg) {

		var string = '';
		if (err) {
			this.unsubscribeMsg = 'There was an error removing from the database :/ ( ' + err + ' )'
		}
		else if (msg) {
			this.unsubscribeMsg = msg
		}
		else {
			this.unsubscribeMsg = 'done'
		}

		console.log(this.unsubscribeMsg)

		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)

	}.bind(this))

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

WatchClassesModel.prototype.close = function() {
	this.$uibModalInstance.close()
};


WatchClassesModel.prototype.WatchClassesModel = WatchClassesModel;
module.exports = WatchClassesModel;
directiveMgr.addRawController(WatchClassesModel)