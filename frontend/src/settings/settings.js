'use strict';
var queue = require('queue-async')
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
				user.download(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this),

			//fetch class for every section and class _id
			function (callback) {
				user.loadAllLists(function (err) {
					callback(err)
				}.bind(this))
			}.bind(this),

			function (callback) {
				return callback()

				var q = queue();

				//load all the sections of all the classes being watched
				user.getAllClassesInLists().forEach(function (aClass) {
					q.defer(function (callback) {
						aClass.loadSections(function (err) {
							callback(err)
						}.bind(this))
					}.bind(this))
				}.bind(this))

				q.awaitAll(function (err) {
					callback(err)
				}.bind(this))


			}.bind(this),

			//get a list of hosts -> list of termTexts
			function (callback) {

				//get a unique list of the term data to make some terms
				var termDatas = [];

				user.getAllClassesInLists().forEach(function (aClass) {
					var termData = _.pick(aClass, 'host', 'termId')

					if (_.filter(termDatas, termData).length === 0) {
						termDatas.push(termData)
					};

				}.bind(this))

				//make some terms from the term data
				//get the terms text, so we can say Spring 2016 or Fall 2015 next to the title of the classes
				async.map(termDatas, function (termData, callback) {
					Term.create(termData).download(callback)
				}.bind(this), function (err, terms) {
					callback(null, terms)
				}.bind(this))
			}
		],
		function (err, terms) {
			if (err) {
				console.log('ERROR', err)
					//don't return
			}

			var classes = user.getAllClassesInLists();


			classes.forEach(function (aClass) {

				//loop through terms and find one that matches
				for (var i = 0; i < terms.length; i++) {
					if (_.isEqual(_.pick(aClass, 'host', 'termId'), _.pick(terms[i], 'host', 'termId'))) {
						aClass.termText = terms[i].text
					}
				};
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


	//if it is not in this list already, add it
	user.toggleListContainsClass('saved', aClass)
};



Settings.prototype.Settings = Settings;
module.exports = Settings;
directiveMgr.addDirective(Settings)
