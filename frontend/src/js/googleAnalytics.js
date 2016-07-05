'use strict';
var _ = require('lodash')
var request = require('./request')

var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')


function GoogleAnalytics() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.$scope.$root.$on('$viewContentLoaded', function (event) {

		ga('send', {
			'hitType': 'pageview',
			'page': this.$location.url(),
			'title': 'Coursepro.io'
		});


	request({
		url: '/log',
		body: {
			url: this.$location.url(),
		},
		useCache: false
	}, function (err, response) {
		if (err) {
			elog("ERROR: couldn't log new page :(", err, response, body);
		}
	}.bind(this))


	}.bind(this));

}

GoogleAnalytics.fnName = 'GoogleAnalytics'
GoogleAnalytics.$inject = ['$scope', '$routeParams', '$route', '$location']
GoogleAnalytics.template = ''

//prototype constructor
GoogleAnalytics.prototype = Object.create(BaseDirective.prototype);
GoogleAnalytics.prototype.constructor = GoogleAnalytics;


GoogleAnalytics.prototype.GoogleAnalytics = GoogleAnalytics;
module.exports = GoogleAnalytics;
directiveMgr.addDirective(GoogleAnalytics)
