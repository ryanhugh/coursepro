'use strict';
require('angular-mocks')

require('../macros.js')
require('../directiveMgr.js')

var macros = require('../macros')

var user = require('../user')
var subjectClassSelector = require('../subjectClassSelector/subjectClassSelector')



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

	describe('$scope.grade', function () {
		it('sets the strength to "strong" if the password length is >8 chars', function () {

			var $scope = $rootScope.$new();


			var controller = $controller(subjectClassSelector, {
				$scope: $scope
			});

			// var element = $compile("<div graph></div>")($scope);
		    // fire all the watches, so the scope expression {{1 + 1}} will be evaluated
		    // $scope.$apply();

		    debugger

			// controller.selectedSubject = 'CS'
			// controller.updateSubjects(function () {
			// 	console.log(controller.term.subjects);
			// }.bind(this))




		});
	});
});
