'use strict';
var request = require('../request')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')


function WatchClassesModel($scope, $uibModalInstance, $timeout, tree) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.model = this;
	$scope.user = user;
	// this.$timeout = $timeout
	// this.$uibModalInstance = $uibModalInstance

	//the current class being watched
	// this.tree = tree;


	//if not the google sign in button will appear
	this.subscribeMsg = ''
	this.unsubscribeMsg = ''


	// if signed in, don't show the model until the request is done 
	// this prevents a flickering of something before the request comes back
	if (user.getAuthenticated()) {
		this.addClassToWatchList()
	}
	else {

		//when authenticate, fire off request
		user.onAuthenticate(this.constructor.name, function (err) {
			if (err) {
				console.log("ERROR", err);
				return;
			}

			this.addClassToWatchList();

		}.bind(this))

		// remove the trigger when this view goes away so the triggers dont stack up
		$scope.$on("$destroy", function () {
			user.removeTriggers(this.constructor.name);
		}.bind(this));


		this.doneRendering = true;
	}
}

WatchClassesModel.$inject = ['$scope', '$uibModalInstance', '$timeout', 'tree']

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

WatchClassesModel.prototype.addClassToWatchList = function () {
	user.addClassToWatchList(this.tree, function (err, msg) {

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

		this.$timeout(function () {
			this.doneRendering = true;
		}.bind(this))
	}.bind(this))
};

WatchClassesModel.prototype.removeClassFromWatchList = function () {

	user.removeClassFromWatchList(this.tree, function (err, msg) {
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

		this.$timeout(function () {
			this.doneRendering = true;
		}.bind(this))

	}.bind(this))
};


WatchClassesModel.prototype.close = function () {
	this.$uibModalInstance.close()
};


WatchClassesModel.prototype.WatchClassesModel = WatchClassesModel;
module.exports = WatchClassesModel;
directiveMgr.addRawController(WatchClassesModel)