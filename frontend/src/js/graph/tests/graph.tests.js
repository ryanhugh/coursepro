'use strict';
require('angular-mocks')

var Graph = require('../graph')
var macros = require('../../macros');
var _ = require('lodash');
var Class = require('../../Class')




// it('works', function () {
// 	Graph
// });

function MockWindow () {

	this.innerWidth = 500;
	this.innerHeight = 500;
}

MockWindow.prototype.addEventListener = function(type, fn) {
	// implement if needed
};





//this will need mock term and that term needs to have a .subjects that are valid

describe('Graph', function () {
	//same as the app in directive manager
	beforeEach(angular.mock.module('app'));

	var $controller;
	var $rootScope;
	var $compile;
	var html;

	beforeEach(inject(function (_$controller_, _$rootScope_, _$compile_, _$location_, $templateCache) {
		// The injector unwraps the underscores (_) from around the parameter names when matching
		$controller = _$controller_;
		$rootScope = _$rootScope_;
		$compile = _$compile_;

		html = $templateCache.get('graph.html');

		// IF WE want to inject this it can be done
		_$location_.path('/graph/neu.edu/201710/CS/7780_1224558283')
	}));


	it('works', function (done) {

		var $scope = $rootScope.$new();



		//CURR: HAVE THE ELEMENTS in a detached dom rn, can either add it to the real dom and this.svg = will work, or iject the mock dome somehow (better)


		var element = $compile(html)($scope);

		if (element.length === 0) {
			elog('YOJFdsjfdskjl')
		}


		// fire all the watches, so the scope expression {{1 + 1}} will be evaluated
		$scope.$apply();


		var graph = $controller(Graph, {
			$scope: $scope,
			$document: element[0].parentNode,
			$window: new MockWindow()
		});
		console.log($controller, $scope);


		var aClass = Class.create({
			"host": "neu.edu",
			"classUid": "7780_1224558283",
			"termId": "201710",
			"subject": "CS",
		});

		graph.go(aClass, function (err) {

			console.log(aClass);

			expect(!!aClass.foreignObject);
			expect(aClass.x !== undefined);
			expect(aClass.y !== undefined);



			done();
		}.bind(this))

		// debugger;
	});

});
