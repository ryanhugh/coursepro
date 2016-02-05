'use strict';
var _ = require('lodash')
var macros = require('./macros')
// var angular = require('angular')

var fullcalendar = require('fullcalendar')

//max depth for a tree, if it reaches this angular will barf
var angularModule = angular.module('app', [require('angular-route'), require('angular-ui-bootstrap'), require('angular-animate'), 'selectize', 'ui.calendar'], ['$rootScopeProvider', function ($rootScopeProvider) {
	$rootScopeProvider.digestTtl(20);
}]);


function DirectiveMgr() {

	//convert the old style urls
	var hash = document.location.hash.slice(1);

	//convert old style
	if (!_(hash).startsWith('/') && hash !== '') {
		if (_(hash).startsWith('search')) {
			hash = '/' + hash
		}
		if (_(hash).startsWith('unsubscribe')) {
			hash = '/' + hash
		}
		else {
			hash = '/graph/' + hash
		}
		document.location.hash = '#' + hash
	}

	var ua = navigator.userAgent;
	if (_(ua).includes("MSIE ") || ua.match(/Trident.*rv\:11\./)) {
		alert("This site doesn't work so great in Internet Explorer/Edge. Try upgrading to Google Chrome or Firefox!")
		return;
	}

	angularModule.config(['$routeProvider', function ($routeProvider) {
		$routeProvider.otherwise({
			redirectTo: '/'
		})
	}]);
}



DirectiveMgr.prototype.calculateName = function (aClass) {
	if (!aClass.fnName) {
		elog("ERROR",aClass,'does not have a fnName');
		// return nu
	}

	return aClass.fnName[0].toLowerCase() + aClass.fnName.slice(1)
};

DirectiveMgr.prototype.getHTMLPathFromClass = function (aClass) {
	return this.getHTMLPathFromName(this.calculateName(aClass));
};

DirectiveMgr.prototype.getHTMLPathFromName = function (directiveName) {
	return '/html/' + directiveName + '.html';
};

//by default, directive.urls is set to the name of the class with the first letter lowercased eg settings
DirectiveMgr.prototype.addDirective = function (directive) {


	//angular creates a instance of the directive (new directive) below, 
	//so can go this.fn(), but not here because the instance has not been made yet
	//if need to override url or directive name, just pass in a config param to this fn
	var directiveName = this.calculateName(directive)


	var angularDirective = {}

	if (directive.priority !== undefined) {
		angularDirective.priority = directive.priority;
	}
	else {
		angularDirective.priority = 0;
	}


	if (directive.$scope) {
		angularDirective.scope = directive.$scope
	}
	else {
		angularDirective.scope = true;
	}



	if (directive.template !== undefined) {
		angularDirective.template = directive.template
	}
	else {
		angularDirective.templateUrl = this.getHTMLPathFromName(directiveName)
	}

	var urls = [];
	//if its a page, use urls
	if (directive.isPage) {

		if (directive.urls) {
			urls = directive.urls;
		}
		else {
			urls = ['/' + directiveName]
		}
	};

	if (directive.link) {
		angularDirective.link = directive.link.bind(directive)
	};


	angularDirective.controller = directive




	//this should be split up to addPage, addController, and addLink
	if (directive.isPage) {

		angularModule.config(['$routeProvider',
			function ($routeProvider) {
				urls.forEach(function (url) {

					$routeProvider.when(url, angularDirective);
				}.bind(this))
			}
		])
	}
	else {
		angularModule.directive(directiveName, function () {
			return angularDirective;
		}.bind(this))
	}
};


DirectiveMgr.prototype.addLink = function (link) {



	if (!link.directiveName) {
		link.directiveName = this.calculateName(link)
	};


	angularModule.directive(link.directiveName, link);
};

DirectiveMgr.prototype.addRawController = function (controller) {


	if (!controller.controllerName) {
		controller.controllerName = this.calculateName(controller)
	};

	angularModule.controller(controller.controllerName, controller)
};

DirectiveMgr.prototype.DirectiveMgr = DirectiveMgr;
module.exports = new DirectiveMgr();
