require('angular-mocks')

require('../macros.js')
require('../directiveMgr.js')

var user = require('../user')
var mockTerm = require('./mocks/mockTerm')

var proxyquire = require('proxyquireify')(require);
var subjectClassSelector = proxyquire('../subjectClassSelector/subjectClassSelector', {
	'../Term': mockTerm,
})



//this will need mock term and that term needs to have a .subjects that are valid

describe('SubjectClassSelector', function () {
	//same as the app in directive manager
	beforeEach(angular.mock.module('app'));

	var $controller;
	var $rootScope;

	beforeEach(inject(function (_$controller_, _$rootScope_) {
		// The injector unwraps the underscores (_) from around the parameter names when matching
		$controller = _$controller_;
		$rootScope = _$rootScope_;

		user.setValue('lastSelectedCollege', 'neu.edu')
		user.setValue('lastSelectedTerm', '201630')

	}));

	describe('$scope.grade', function () {
		it('sets the strength to "strong" if the password length is >8 chars', function () {

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
});