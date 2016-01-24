'use strict';
var queue = require('queue-async')
var _ = require('lodash')
var async = require('async')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var Class = require('../Class')

function List() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	// debugger

	async.waterfall([

			//fetch the user data
			function (callback) {

				//create all the classes
				Class.createMany(this.$routeParams, function (err, classes) {
					callback(err, classes)
				}.bind(this))
			}.bind(this)

			// //fetch all sections DONT DO THIS load when you need them like graph
			// function (classes, callback) {
			// 	callback()

			// 	// var q = queue();

			// 	// classes.forEach(function (aClass) {

			// 	// 	q.defer(function (callback) {
			// 	// 		aClass.loadSections(function (err) {
			// 	// 			callback(err)
			// 	// 		}.bind(this))
			// 	// 	}.bind(this))
			// 	// }.bind(this))

			// 	// q.awaitAll(function (err) {
			// 	// 	callback(err)
			// 	// }.bind(this))

			// }.bind(this),

		],
		function (err, classes) {
			if (err) {
				console.log('ERROR', err)
					//don't return
			}



			classes.sort(function (a, b) {
				return a.compareTo(b)
			}.bind(this))


			this.$scope.classes = classes

			this.$scope.$apply()

		}.bind(this))
}

List.isPage = true;


List.$inject = ['$scope', '$routeParams']

List.urls = ['/list/:host/:termId/:subject']

//prototype constructor
List.prototype = Object.create(BaseDirective.prototype);
List.prototype.constructor = List;



List.prototype.List = List;
module.exports = List;
directiveMgr.addDirective(List)