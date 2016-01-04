'use strict';

var angular = require('angular')
var angularDirectives = angular.module('app', []); 


function DirectiveMgr() {



}


DirectiveMgr.prototype.addDirective = function (directive) {

	//angular creates a instance of the directive (new directive) below, 
	//so can go this.fn(), but not here because the instance has not been made yet
	//if need to override url or directive name, just pass in a config param to this fn
	var directiveName = directive.name.toLowerCase()

	angularDirectives.directive(directiveName, function () {
		return {
			templateUrl: '/html/'+directiveName+'.html',
			scope: true,
			controller: directive
		};
	}.bind(this))
};



DirectiveMgr.prototype.DirectiveMgr = DirectiveMgr;
module.exports = new DirectiveMgr();
