'use strict';

var angular = require('angular')
var angularModule = angular.module('app', [require('angular-route')]);


function DirectiveMgr() {



}


DirectiveMgr.prototype.addDirective = function (directive) {



	//angular creates a instance of the directive (new directive) below, 
	//so can go this.fn(), but not here because the instance has not been made yet
	//if need to override url or directive name, just pass in a config param to this fn
	var directiveName = directive.name.toLowerCase()
	var htmlPath = '/html/' + directiveName + '.html'
	var url;

	//homepage overrides url
	if (directive.url) {
		url = directive.url
	}
	else {
		url = '/' + directiveName
	}

	if (directive.isPage) {

		angularModule.config(['$routeProvider',
			function ($routeProvider) {
				$routeProvider
					.when(url, {
						templateUrl: htmlPath,
						controller: directive,
					});
			}
		])
	}
	else {
		angularModule.directive(directiveName, function () {
			return {
				templateUrl: htmlPath,
				scope: true,
				controller: directive
			};
		}.bind(this))
	}



};



DirectiveMgr.prototype.DirectiveMgr = DirectiveMgr;
module.exports = new DirectiveMgr();