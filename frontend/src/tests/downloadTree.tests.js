'use strict';

var mockClass = require('./mocks/mockClass')
var treeMgr = require('../graph/treeMgr')
var proxyquire = require('proxyquireify')(require);

// require('../graph/downloadTree')
var downloadTree = proxyquire('../graph/downloadTree', {
	'../Class': mockClass,
	'Class': mockClass
})

function DownloadTreeTests() {

}



describe('DownloadTreeTests', function () {

	describe('eh', function () {
		it('makes sures fetchFullTree is constant on constant data', function () {


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
