'use strict';
var angular = require('angular')
require('angular-mocks')

var Graph = require('../graph')
var macros = require('../../macros');
var _ = require('lodash');
var Class = require('../../Class')




// it('works', function () {
// 	Graph
// });

function MockWindow() {

	this.innerWidth = 500;
	this.innerHeight = 500;
}

MockWindow.prototype.addEventListener = function (type, fn) {
	// implement if needed
};





//this will need mock term and that term needs to have a .subjects that are valid

fdescribe('Graph', function () {
	//same as the app in directive manager
	beforeEach(angular.mock.module('app'));

	var graph;
	var win;

		// The injector unwraps the underscores (_) from around the parameter names when matching
	beforeEach(inject(function ($controller, $rootScope, $compile, $templateCache) {
		var $scope = $rootScope.$new();

		var html = $templateCache.get('graph.html');
		if (!html) {
			elog('nope')
		}
		
		// IF WE want to inject this it can be done
		// _$location_.path('/graph/neu.edu/201710/CS/7780_1224558283');
		
		
		var element = $compile(html)($scope);
		
		//Create a detached document fragment and a new scope for each test
		// so no cleanup is necessary on the main document tree.
		var doc = $(document.createDocumentFragment());
		doc.append(element);
		$scope.$apply();
		
		
		win = new MockWindow()
		
		
		graph = $controller(Graph, {
			$scope: $scope,
			$document: doc,
			$window: win
		});

	}));


	it('works', function (done) {

		var aClass = Class.create({
			"host": "neu.edu",
			"classUid": "7780_1224558283",
			"termId": "201710",
			"subject": "CS",
		});

		graph.go(aClass, function (err) {

			expect(!!aClass.foreignObject);
			expect(aClass.x).toBe((win.innerWidth - macros.SEARCH_WIDTH) / 2);
			expect(aClass.y > 0 && aClass.y < graph.graphHeight);


			done();
		})
	});
	
	
	it('should also work for 4800',function(done) {
		
		
		var aClass = Class.create({
			"host": "neu.edu",
			"classUid": "4800_1303374065",
			"termId": "201710",
			"subject": "CS",
		});

		graph.go(aClass, function (err) {

			console.log(aClass);

			expect(!!aClass.foreignObject);
			// expect(aClass.x).toBe((win.innerWidth - macros.SEARCH_WIDTH) / 2);
			// expect(aClass.y > 0 && aClass.y < graph.graphHeight);


			done();
		})
		
		
	})

});
