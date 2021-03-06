/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

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
			elog("ERROR: couldn't log new page :(", err, response);
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
directiveMgr.addController(GoogleAnalytics)
