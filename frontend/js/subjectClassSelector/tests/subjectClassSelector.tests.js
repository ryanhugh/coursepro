'use strict';
require('angular-mocks')

var macros = require('../../macros')
var directiveMgr = require('../../directiveMgr')

var user = require('../../data/user')
var subjectClassSelector = require('../subjectClassSelector')



//this will need mock term and that term needs to have a .subjects that are valid

describe('SubjectClassSelector', function () {
	//same as the app in directive manager
	beforeEach(angular.mock.module('app'));

	var $controller;
	var $rootScope;
	var $compile;

	beforeEach(inject(function (_$controller_, _$rootScope_, _$compile_) {
		// The injector unwraps the underscores (_) from around the parameter names when matching
		$controller = _$controller_;
		$rootScope = _$rootScope_;
		$compile = _$compile_;

		user.setValue(macros.LAST_SELECTED_COLLEGE, 'neu.edu');
		user.setValue(macros.LAST_SELECTED_TERM, '201710');

	}));

	it('should work', function () {

		var $scope = $rootScope.$new();


		var controller = $controller(subjectClassSelector, {
			$scope: $scope
		});

		// controller.selectedSubject = 'CS'
		// controller.updateSubjects(function () {
		// 	console.log(controller.term.subjects);
		// }.bind(this))

	});
});
