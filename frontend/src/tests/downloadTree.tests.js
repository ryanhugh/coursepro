'use strict';

var mockClass = require('./mocks/mockClass')
var treeMgr = require('../graph/treeMgr')
var proxyquire = require('proxyquireify')(require);

var downloadTree = proxyquire('../graph/downloadTree', {
	'../Class': mockClass,
})


describe('DownloadTreeTests', function () {

	describe('fetchFullTree', function () {
		it('makes sure fetchFullTree is constant on constant data', function () {


			downloadTree.fetchFullTree({
				host: 'neu.edu',
				termId: '201530',
				subject: 'CS',
				classId: '4800'
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
    for (var a of as) if (!bs.has(a)) return false;
    return true;
}

describe('TreeMgr', function () {

	describe('.getSubsets', function () {
		it('works', function () {

			setsAreEqual(new Set([[],[1],[2],[3],[1,2],[2,3],[1,3],[1,2,3]]),treeMgr.getSubsets([1,2,3]))

		});
	});
});
