'use strict';
var moment = require('moment')

var macros = require('../macros')
var request = require('../request')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../data/user')


function WatchClassesModel() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.model = this;
	this.$scope.user = user;

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
		this.$scope.$on("$destroy", function () {
			user.removeTriggers(this.constructor.name);
		}.bind(this));


		this.doneRendering = true;
	}
}

WatchClassesModel.fnName = 'WatchClassesModel'
WatchClassesModel.$inject = ['$scope', '$uibModalInstance', '$timeout', 'node']

//called from controllers wanting to open this
WatchClassesModel.open = function (caller, node) {
	if (!caller.$uibModal) {
		elog('tried to open a WatchClassesModel but caller does not have a $uibModal')
	}
	if (!node) {
		elog()
	}

	caller.$uibModal.open({
		animation: true,
		templateUrl: directiveMgr.getHTMLPathFromClass(WatchClassesModel),
		controller: WatchClassesModel,
		resolve: {
			node: node
		}
	})
};

WatchClassesModel.prototype.addClassToWatchList = function () {
	user.addToList(macros.WATCHING_LIST, [this.node], this.node.class.sections, function (err, msg) {

		this.error = false;

		if (err) {
			this.error = true;
			this.subscribeMsg = err;
		}
		else if (this.node.class.name) {
			this.subscribeMsg = 'Successfully registered for updates on ' + this.node.class.name + '!'
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

	user.removeFromList(macros.WATCHING_LIST, [this.node], this.node.class.sections, function (err, msg) {
		var string = '';
		if (err) {
			this.unsubscribeMsg = err
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

WatchClassesModel.prototype.getTimeDuration = function() {
	return moment.duration(macros.DB_REFRESH_INTERVAL).asMinutes()
};


WatchClassesModel.prototype.close = function () {
	this.$uibModalInstance.close()
};


WatchClassesModel.prototype.WatchClassesModel = WatchClassesModel;
module.exports = WatchClassesModel;
directiveMgr.addRawController(WatchClassesModel)
