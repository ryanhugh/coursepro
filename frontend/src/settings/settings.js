'use strict';
var queue = require('d3-queue').queue;
var _ = require('lodash')
var async = require('async')
var moment = require('moment')

var request = require('../request')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')
var Term = require('../Term')

var Class = require('../Class')

function Settings() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.alertMsgText = ''
	this.showAlertMsg = false;

	this.isLoading = true;
	if (_(this.$location.path()).startsWith('/unsubscribe')) {

		var path = {};
		for (var attrName in this.$routeParams) {
			path[attrName] = decodeURIComponent(this.$routeParams[attrName])
		}

		Class.create(path).download(function (err, aClass) {
			aClass.loadSections(function (err) {
				user.removeFromList('watching', [aClass], aClass.sections, function (errMsg, clientMsg) {
					console.log("msg here", errMsg, clientMsg);
					if (errMsg) {
						this.alertMsgText = errMsg;
					}
					else {
						this.alertMsgText = clientMsg;
					}
					this.showAlertMsg = true;

					this.$scope.$apply();

					//and make it go away after 5 seconds
					this.$timeout(function () {
						this.showAlertMsg = false;
					}.bind(this), 5000)

				}.bind(this))
			}.bind(this))
		}.bind(this))

	}

	async.waterfall([

			//fetch the user data
			function (callback) {
				user.onAuthFinish('settings',function (err) {
					callback(err)
				}.bind(this))
			}.bind(this),

			//fetch all classes in watching and saved
			function (callback) {
				var q = queue();

				q.defer(function (callback) {
					user.loadList('watching', function (err) {
						callback(err)
					}.bind(this))

				}.bind(this))

				q.defer(function (callback) {
					user.loadList('saved', function (err) {
						callback(err)
					}.bind(this))
				}.bind(this))

				q.awaitAll(function (err) {
					callback(err)
				}.bind(this))

			}.bind(this),
		],
		function (err) {
			if (err) {
				console.log('ERROR', err)
					//don't return
			}

			//unique list of classes
			var classes = [];

			var currentTermId = user.getValue('lastSelectedTerm')
			var currentHost = user.getValue('lastSelectedCollege')

			//merge watching and saved, remove duplicates
			user.lists['watching'].classes.concat(user.lists['saved'].classes).forEach(function (aClass) {
				if (currentTermId != aClass.termId || currentHost != aClass.host) {
					return;
				};

				if (_.filter(classes, {
						_id: aClass._id
					}).length == 0) {

					classes.push(aClass)
				}
			}.bind(this))

			classes.sort(function (a, b) {
				return a.compareTo(b)
			}.bind(this))


			this.isLoading = false;

			this.$scope.classes = classes

			this.$scope.$apply()

		}.bind(this))

	this.$scope.addClass = this.addClass.bind(this)
}

Settings.fnName = 'Settings'
Settings.isPage = true;
Settings.urls = ['/saved', '/unsubscribe/:host/:termId/:subject/:classId']
Settings.$inject = ['$scope', '$timeout', '$routeParams', '$location']

//prototype constructor
Settings.prototype = Object.create(BaseDirective.prototype);
Settings.prototype.constructor = Settings;


Settings.prototype.addClass = function (aClass) {

	var matches = _.filter(this.$scope.classes, {
		_id: aClass._id
	})

	//if this class already exists, ignore
	if (matches.length > 0) {
		return;
	}

	this.$scope.classes.push(aClass)

	setTimeout(function () {
		this.$scope.$apply()
	}.bind(this))


	//if it is not in this list already, add it
	user.toggleListContainsClass('saved', aClass)
};



Settings.prototype.Settings = Settings;
module.exports = Settings;
directiveMgr.addDirective(Settings)
