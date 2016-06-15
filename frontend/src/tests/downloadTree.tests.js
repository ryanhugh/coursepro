'use strict';

var treeMgr = require('../graph/treeMgr')
var something = require('es6-collections')

var downloadTree = require('../graph/downloadTree')


describe('DownloadTreeTests', function () {

	describe('fetchFullTree', function () {
		it('makes sure fetchFullTree is constant on constant data', function () {


			downloadTree.fetchFullTree({
				host: 'neu.edu',
				termId: '201710',
				subject: 'CS',
				classUid: "4750_1045395676",
			}, function (err, tree) {
				expect(err).toBe(null);

				treeMgr.go(tree)
				
				expect(treeMgr.countClassesInTree(tree)).toBe(13);
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
