'use strict';
var queue = require('queue-async')
var _ = require('lodash')
var async = require('async')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


function GoogleAnalytics() {
	BaseDirective.prototype.constructor.apply(this, arguments);



}
GoogleAnalytics.$inject = ['$scope', '$routeParams', '$route', '$location']

//prototype constructor
GoogleAnalytics.prototype = Object.create(BaseDirective.prototype);
GoogleAnalytics.prototype.constructor = GoogleAnalytics;


GoogleAnalytics.prototype.GoogleAnalytics = GoogleAnalytics;
module.exports = GoogleAnalytics;
directiveMgr.addDirective(GoogleAnalytics)
