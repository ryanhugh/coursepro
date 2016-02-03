'use strict';
var _ = require('lodash')

var request = require('../request')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')


function Help() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	

	var path = this.$location.path()
	if (_(path).startsWith('/')) {
		path = path.slice(1)
	}
	
	path = path.split('/')[0];

	if (path === '') {
		path = 'homepage'
	};

	this.path = path;
	// console.log("path",path);


	// debugger
}

Help.$inject = ['$scope', '$uibModalInstance','$location','$route','$routeParams']

//called from controllers wanting to open this
Help.open = function (caller) {
	if (!caller.$uibModal) {
		elog('tried to open a Help but caller does not have a $uibModal')
	}
	
	caller.$uibModal.open({
		animation: true,
		templateUrl: directiveMgr.getHTMLPathFromClass(Help),
		controller: Help
	})
};

Help.prototype.close = function () {
	this.$uibModalInstance.close()
};






Help.prototype.Help = Help;
module.exports = Help;
directiveMgr.addRawController(Help)
