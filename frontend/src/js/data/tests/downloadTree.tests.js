'use strict';
var treeMgr = require('../graph/treeMgr')
var downloadTree = require('../graph/downloadTree')

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

