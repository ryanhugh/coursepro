/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

'use strict';
var angular = require('angular')
require('angular-mocks')

var Graph = require('../graph')
var macros = require('../../macros');
var _ = require('lodash');
var Class = require('../../data/Class')



function MockWindow() {

	this.innerWidth = 1920;
	this.innerHeight = 965;
}

MockWindow.prototype.addEventListener = function (type, fn) {
	// implement if needed
};



function isWithinBound(value, goalValue, delta) {
	if (typeof value !== 'number' || typeof goalValue != 'number' || typeof delta !== 'number') {
		elog('no')
		return false;
	}

	return value > goalValue - delta && value < goalValue + delta;
}



//this will need mock term and that term needs to have a .subjects that are valid

describe('Graph', function () {
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

		var aClass = {
			"host": "neu.edu",
			"classUid": "7780_1224558283",
			"termId": "201710",
			"subject": "CS",
		};

		graph.go(aClass, function (err, aClass) {

			expect(!!aClass.foreignObject);
			expect(isWithinBound(aClass.x, (win.innerWidth - macros.SEARCH_WIDTH) / 2, 5))
			expect(aClass.y > 0 && aClass.y < graph.graphHeight);

			expect(false).toBe(true);
			done();
		})
	});


	it('should also work for 4800', function (done) {


		var aClass = {
			"host": "neu.edu",
			"classUid": "4800_1303374065",
			"termId": "201710",
			"subject": "CS",
		};

		graph.go(aClass, function (err, aClass) {

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
			expect(leftPrereq.x + macros.NODE_WIDTH < aClass.x)
			expect(rightPrerq.x - macros.NODE_WIDTH > aClass.x)

			expect(rightPrerq.wouldSatisfyNode).toBe(true);
			expect(leftPrereq.wouldSatisfyNode).toBe(true);

			// expect(isWithinBound(aClass.x, (win.innerWidth - macros.SEARCH_WIDTH) / 2, 5))
			// expect(aClass.y > 0 && aClass.y < graph.graphHeight);


			done();
		})


	})

});
