'use strict';
var assert = require('assert')

var macros = require('../macros')
var downloadTree = require('../graph/downloadTree')
var treeMgr = require('../graph/treeMgr')
var Class = require('../Class')

function DownloadTreeTests() {

}


DownloadTreeTests.prototype.go = function () {

	downloadTree.fetchFullTree({
		host: 'neu.edu',
		termId: '201630',
		subject: 'CS',
		classId: '4400'



	}, function (err, tree) {
		treeMgr.go(tree)
		console.log(err, tree)

	}.bind(this))

}



DownloadTreeTests.prototype.DownloadTreeTests = DownloadTreeTests
module.exports = new DownloadTreeTests()