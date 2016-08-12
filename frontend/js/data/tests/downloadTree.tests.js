'use strict';
var treeMgr = require('../../graph/treeMgr')
var Node = require('../../graph/Node')
var downloadTree = require('../../graph/downloadTree')

describe('fetchFullTree', function () {
	it('makes sure fetchFullTree is constant on constant data', function () {

		localStorage.clear()

		downloadTree.fetchFullTree({
			host: 'neu.edu',
			termId: '201710',
			subject: 'CS',
			classUid: "4750_1045395676",
		}, function (err, tree) {
			expect(err).toBe(null);

			var rootNode = Node.create(tree);

			treeMgr.go(rootNode)

			expect(treeMgr.countClassesInTree(rootNode)).toBe(13);
		}.bind(this))

	});
});

