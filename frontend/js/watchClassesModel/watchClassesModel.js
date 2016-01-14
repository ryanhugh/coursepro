'use strict';
var request = require('../request')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')


function WatchClassesModel($scope, $uibModalInstance, $timeout, tree) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.model = this;
	$scope.user = user;
	this.$uibModalInstance = $uibModalInstance

	//the current class being watched
	this.tree = tree;


	//if not the google sign in button will appear
	this.subscribeMsg = ''
	this.unsubscribeMsg = ''


	// if signed in, don't show the model until the request is done 
	// this prevents a flickering of something before the request comes back
	if (user.getAuthenticated()) {
		this.addClassToWatchList(function () {
			$timeout(function () {
				this.doneRendering = true;
			}.bind(this))
		}.bind(this))
	}
	else {

		//when authenticate, fire off request
		user.onAuthenticate(function (err) {
			if (err) {
				console.log("ERROR", err);
				return;
			}

			this.addClassToWatchList(function () {
				setTimeout(function () {
					this.$scope.$apply()
				}.bind(this), 0)
			}.bind(this));

		}.bind(this))


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
	if (!callback) {
		callback = function () {}
	};

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


WatchClassesModel.prototype.removeClassFromWatchList = function (callback) {
	if (!callback) {
		callback = function () {}
	};


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

		callback()
	}.bind(this))
};


WatchClassesModel.prototype.removeClick = function() {
	this.removeClassFromWatchList(function () {
		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this))
	}.bind(this))
};


WatchClassesModel.prototype.close = function () {
	this.$uibModalInstance.close()
};


WatchClassesModel.prototype.WatchClassesModel = WatchClassesModel;
module.exports = WatchClassesModel;
directiveMgr.addRawController(WatchClassesModel)