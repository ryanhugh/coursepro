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

function Settings() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	async.waterfall([

			//fetch the user data
			function (callback) {
				user.download(function () {
					callback()
				}.bind(this))
			}.bind(this),

			//fetch class for every section and class _id
			function (callback) {
				user.loadWatching(function () {
					callback()
				}.bind(this))
			}.bind(this),

			function (callback) {
				var q = queue();

				//load all the sections of all the classes being watched
				user.watching.classes.forEach(function (aClass) {
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

				user.watching.classes.forEach(function (aClass) {
					var termData = _.pick(aClass, 'host', 'termId')

					if (_.where(termDatas, termData).length === 0) {
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


			user.watching.classes.forEach(function (aClass) {

				//loop through terms and find one that matches
				for (var i = 0; i < terms.length; i++) {
					if (_.isEqual(_.pick(aClass, 'host', 'termId'), _.pick(terms[i], 'host', 'termId'))) {
						aClass.termText = terms[i].text
					}
				};
			}.bind(this))


			this.$scope.classes = user.watching.classes;
			this.$scope.user = user;

			this.$scope.$apply()

		}.bind(this))
}

Settings.isPage = true;

Settings.$inject = ['$scope']

//prototype constructor
Settings.prototype = Object.create(BaseDirective.prototype);
Settings.prototype.constructor = Settings;

Settings.prototype.test = function(j) {
	console.log(j);
};



Settings.prototype.Settings = Settings;
module.exports = Settings;
directiveMgr.addDirective(Settings)