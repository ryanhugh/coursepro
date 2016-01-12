'use strict';

var angular = require('angular')

//max depth for a tree, if it reaches this angular will barf
var angularModule = angular.module('app', [require('angular-route')], function ($rootScopeProvider) {
	$rootScopeProvider.digestTtl(20);
});


function DirectiveMgr() {

}


DirectiveMgr.prototype.calculateName = function (aClass) {
	return aClass.name[0].toLowerCase() + aClass.name.slice(1)
};

DirectiveMgr.prototype.addDirective = function (directive) {



	//angular creates a instance of the directive (new directive) below, 
	//so can go this.fn(), but not here because the instance has not been made yet
	//if need to override url or directive name, just pass in a config param to this fn
	var directiveName = this.calculateName(directive)
	var htmlPath = '/html/' + directiveName + '.html'
	var url;

	//homepage overrides url
	if (directive.url) {
		url = directive.url
	}
	else {
		url = '/' + directiveName
	}

	//this should be split up to addPage, addController, and addLink
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



DirectiveMgr.prototype.DirectiveMgr = DirectiveMgr;
module.exports = new DirectiveMgr();