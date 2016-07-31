'use strict';
var _ = require('lodash')
var macros = require('./macros')
var angular = require('angular')
require('bootstrap')
require('fullcalendar')

if ('serviceWorker' in navigator) {
	if (!macros.UNIT_TESTS) {
		navigator.serviceWorker.register('sw.js').then(function (reg) {
			// registration worked
			console.log('Registration succeeded. Scope is ' + reg.scope);
		}).catch(function (error) {
			// registration failed
			elog('Service worker registration failed with ', error);
		});
	}
}
else {
	console.log('Service worker not supported')
}

var angularModule = angular.module('app', [require('angular-route'), require('angular-ui-bootstrap'), require('angular-animate'), 'selectize', 'ui.calendar', 'templates', 'infinite-scroll'], ['$rootScopeProvider', '$compileProvider', function ($rootScopeProvider, $compileProvider) {
	
	//max depth for a tree, if it reaches this angular will barf
	$rootScopeProvider.digestTtl(20);

	// https://docs.angularjs.org/guide/production
	$compileProvider.debugInfoEnabled(false);
}]);




angularModule.factory('$exceptionHandler', function () {
	return function (exception, cause) {
		exception.message += ' (caused by "' + cause + '")';

		//elog that jawn
		var toLog = {};
		toLog.stack = exception.stack;
		toLog.message = exception.message
		toLog.name = exception.name

		elog(JSON.stringify(toLog))

		throw exception;
	};
});



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
		elog("ERROR", aClass, 'does not have a fnName');
		return '';
	}

	return aClass.fnName[0].toLowerCase() + aClass.fnName.slice(1)
};

DirectiveMgr.prototype.getHTMLPathFromClass = function (aClass) {
	return this.getHTMLPathFromName(this.calculateName(aClass));
};

//keep in sync with the gulpfile that loads up the template caches
//this is not the URL of the template, they are all in the templateCache (html.js)
DirectiveMgr.prototype.getHTMLPathFromName = function (directiveName) {
	return directiveName + '.html';
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
	}


	angularModule.directive(link.directiveName, link);
};

DirectiveMgr.prototype.addRawDirective = function(Directive) {
	if (!Directive.directiveName) {
		Directive.directiveName = this.calculateName(Directive)
	}
	
	if (!Directive.$inject) {
		console.warn('no $inject?');
		Directive.$inject = []
	}
	
	if (Directive.$inject.includes('$scope')) {
		elog('Cant inject a $scope into a directive, only controllers. Use the link function in directives.')
	}
	
	function AngularDirective () {
		var args = [].slice.call(arguments)
		// http://stackoverflow.com/questions/1606797/use-of-apply-with-new-operator-is-this-possible
		return new (Function.prototype.bind.apply(Directive, [null].concat(args)))
	}
	
	AngularDirective.$inject = Directive.$inject;

	angularModule.directive(Directive.directiveName, AngularDirective);
}


DirectiveMgr.prototype.addRawController = function (controller) {


	if (!controller.controllerName) {
		controller.controllerName = this.calculateName(controller)
	};

	angularModule.controller(controller.controllerName, controller)
};

DirectiveMgr.prototype.DirectiveMgr = DirectiveMgr;
module.exports = new DirectiveMgr();
