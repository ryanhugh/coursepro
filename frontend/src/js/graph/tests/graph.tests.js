'use strict';
var angular = require('angular')
require('angular-mocks')

var Graph = require('../graph')
var macros = require('../../macros');
var _ = require('lodash');
var Class = require('../../Class')



function MockWindow() {

	this.innerWidth = 1920;
	this.innerHeight = 965;
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
	var testDiv;

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

		testDiv = document.createElement('div');

		document.body.appendChild(testDiv);

		$(testDiv).append(element)

		//Create a detached document fragment and a new scope for each test
		// so no cleanup is necessary on the main document tree.
		// var doc = $(document.createDocumentFragment());
		// doc.append(element);
		var doc = $(document)
		$scope.$apply();


		win = new MockWindow()


		graph = $controller(Graph, {
			$scope: $scope,
			$document: doc,
			$window: win
		});

	}));

	afterEach(function () {
		testDiv.remove();
	}.bind(this))


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


	it('should also work for 4800', function (done) {


		var aClass = Class.create({
			"host": "neu.edu",
			"classUid": "4800_1303374065",
			"termId": "201710",
			"subject": "CS",
		});

		graph.go(aClass, function (err) {

			console.log(aClass);

			expect(!!aClass.foreignObject);

			expect(aClass.prereqs.values.length).toBe(2);

			// Check to make sure the height and width are valid.
			// Don't expect a specific value so this test isn't 
			expect(aClass.height > 50);
			expect(aClass.width > 50);

			expect(aClass.height < 500);
			expect(aClass.width < 500);


			expect(aClass.wouldSatisfyNode).toBe(false);

			// Find the prereq that was put on the left and on the right of the root node
			var leftPrereq;
			var rightPrerq;
			if (aClass.prereqs.values[0].x < aClass.prereqs.values[1].x) {
				leftPrereq = aClass.prereqs.values[0];
				rightPrerq = aClass.prereqs.values[1];
			}
			else {
				rightPrerq = aClass.prereqs.values[0];
				leftPrereq = aClass.prereqs.values[1];
			}
			expect(leftPrereq.x + graph.nodeWidth < aClass.x)
			expect(rightPrerq.x - graph.nodeWidth > aClass.x)

			expect(rightPrerq.wouldSatisfyNode).toBe(true);
			expect(leftPrereq.wouldSatisfyNode).toBe(true);

			// expect(aClass.x).toBe((win.innerWidth - macros.SEARCH_WIDTH) / 2);
			// expect(aClass.y > 0 && aClass.y < graph.graphHeight);


			done();
		})


	})

});
