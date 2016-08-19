'use strict';
var treeMgr = require('../../graph/treeMgr')
var Node = require('../../graph/Node')
var downloadTree = require('../../graph/downloadTree')

it('makes sure fetchFullTree is constant on constant data', function (done) {

	downloadTree.fetchFullTree({
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
		classUid: "4750_1045395676",
	}, function (err, tree) {
		expect(err).toBe(null);

		var rootNode = Node.create(tree);

		treeMgr.go(rootNode)

		// This used to be 13 before the prereqs of unselected nodes were removed
		expect(treeMgr.countClassesInTree(rootNode)).toBe(4);
		done()
	}.bind(this))

});
