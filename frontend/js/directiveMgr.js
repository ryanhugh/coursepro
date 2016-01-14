'use strict';

var angular = require('angular')

//max depth for a tree, if it reaches this angular will barf
var angularModule = angular.module('app', [require('angular-route'),require('angular-ui-bootstrap')], function ($rootScopeProvider) {
	$rootScopeProvider.digestTtl(20);
});


function DirectiveMgr() {

}


DirectiveMgr.prototype.calculateName = function (aClass) {
	return aClass.name[0].toLowerCase() + aClass.name.slice(1)
};

DirectiveMgr.prototype.getHTMLPathFromClass = function(aClass) {
	return this.getHTMLPathFromName(this.calculateName(aClass));
};

DirectiveMgr.prototype.getHTMLPathFromName = function(directiveName) {
	return '/html/' + directiveName + '.html';
};

//by default, directive.urls is set to the name of the class with the first letter lowercased eg settings
DirectiveMgr.prototype.addDirective = function (directive) {


	//angular creates a instance of the directive (new directive) below, 
	//so can go this.fn(), but not here because the instance has not been made yet
	//if need to override url or directive name, just pass in a config param to this fn
	var directiveName = this.calculateName(directive)
	var htmlPath = this.getHTMLPathFromName(directiveName)
	var urls = '';

	//homepage overrides url
	if (directive.isPage) {

		if (directive.urls) {
			urls = directive.urls;
		}
		else {
			urls = ['/' + directiveName]
		}
	};

	//this should be split up to addPage, addController, and addLink
	if (directive.isPage) {

		angularModule.config(['$routeProvider',
			function ($routeProvider) {
				urls.forEach(function (url) {

					$routeProvider.when(url, {
						templateUrl: htmlPath,
						controller: directive,
					});
				}.bind(this))
			}
		])
	}
	else if (directive.isLink) {

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


DirectiveMgr.prototype.addLink = function (link) {



	if (!link.directiveName) {
		link.directiveName = this.calculateName(link)
	};


	angularModule.directive(link.directiveName, link);
};

DirectiveMgr.prototype.addRawController = function(controller) {


	if (!controller.controllerName) {
		controller.controllerName = this.calculateName(controller)
	};

	angularModule.controller(controller.controllerName,controller)
};

DirectiveMgr.prototype.DirectiveMgr = DirectiveMgr;
module.exports = new DirectiveMgr();