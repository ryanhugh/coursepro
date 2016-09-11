'use strict';
var _ = require('lodash')
var async = require('async')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')
var Keys = require('../../../common/Keys')

var Class = require('../data/Class')

function List() {
	BaseDirective.prototype.constructor.apply(this, arguments);


	this.$scope.$on('$routeChangeSuccess', function () {

		//wait for a subject
		if (this.$routeParams.subject) {
			this.$scope.focusSelector = false;
			this.go()
		}
		else {
			this.$scope.focusSelector = true;
		}

		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)


	}.bind(this))

	this.$scope.addSubject = this.addSubject.bind(this)
}

List.fnName = 'List'
List.isPage = true;
List.$inject = ['$scope', '$routeParams', '$route']
List.urls = ['/list/:host/:termId/:subject?']

//prototype constructor
List.prototype = Object.create(BaseDirective.prototype);
List.prototype.constructor = List;

List.prototype.go = function () {
	this.isLoading = true;
	if (!this.$routeParams.subject) {
		this.$scope.focusSelector = true;
		setTimeout(function () {
			this.$scope.$apply();
		}.bind(this), 0)
		return;
	}

	async.waterfall([

			//fetch the user data
			function (callback) {

				//create all the classes
				Class.createMany(Keys.create(this.$routeParams), function (err, classes) {
					callback(err, classes)
				}.bind(this))
			}.bind(this)
		],
		function (err, classes) {
			if (err) {
				elog('ERROR', err)
				return;
			}

			classes.sort(function (a, b) {
				return a.compareTo(b)
			}.bind(this))


			this.$scope.classes = classes
			this.isLoading = false;
			this.$scope.$apply()

		}.bind(this))

};

List.prototype.addSubject = function (subject) {
	this.$route.updateParams({
		subject: subject.subject
	})
};


List.prototype.List = List;
module.exports = List;
directiveMgr.addController(List)
