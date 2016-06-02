'use strict';

var mockClass = require('./mocks/mockClass')
var treeMgr = require('../graph/treeMgr')
var proxyquire = require('proxyquireify')(require);
var something = require('es6-collections')

var downloadTree = proxyquire('../graph/downloadTree', {
	'../Class': mockClass,
})


describe('DownloadTreeTests', function () {

	describe('fetchFullTree', function () {
		it('makes sure fetchFullTree is constant on constant data', function () {


			downloadTree.fetchFullTree({
				host: 'neu.edu',
				termId: '201710',
				subject: 'CS',
				classUid: "4800_1303374065",
			}, function (err, tree) {
				expect(err).toBe(null);

				treeMgr.go(tree)
				
				expect(treeMgr.countClassesInTree(tree)).toBe(18);
			}.bind(this))

		});
	});
});


function setsAreEqual(as, bs) {
    if (as.size !== bs.size) return false;
    var values = Array.from(as)
    for (var i = 0; i < values.length; i++) {
    	if (!bs.has(values[i])) {
    		return false;
    	}
    }
    return true;
}

describe('TreeMgr', function () {

	describe('.getSubsets', function () {
		it('works', function () {

			setsAreEqual(new Set([[],[1],[2],[3],[1,2],[2,3],[1,3],[1,2,3]]),treeMgr.getSubsets([1,2,3]))

		});
	});
});
