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
var _ = require('lodash')
var queue = require('d3-queue').queue;
var async = require('async')

var request = require('../request')
var macros = require('../macros')
var Class = require('../data/Class')
var RequisiteBranch = require('../data/RequisiteBranch')


function DownloadTree() {
	this.counter = 0
}


//this is called on a subtree when it responds from the server and when recursing down a tree
DownloadTree.prototype.increaseTreeDepth = function (tree, callback) {

	var toProcess = [tree];

	// unlike before, we NEVER need to visit the same class twice
	var visited = [];
	var treeIsDone = true;
	var subTree;

	//make a queue of sub trees to be processed
	var q = queue()

	this.counter++;
	// just a check to make sure nothing ridiculous is going on
	if (this.counter > 500 || toProcess.length > 500) {
		elog('counter', this.counter, 'to process:', toProcess.length, tree, toProcess.slice(0, 10));
		return callback(null, tree)
	}

	while ((subTree = toProcess.pop())) {

		//this prevents infinate recursion in both coreq->coreq-> coreq and in more complicated loops
		if (_(visited).includes(subTree)) {
			continue;
		}
		visited.push(subTree)

		if (subTree.isString || (subTree instanceof RequisiteBranch)) {
			toProcess = toProcess.concat(subTree.coreqs.values).concat(subTree.prereqs.values)
			continue;
		}
		else if (subTree.dataStatus === macros.DATASTATUS_NOTSTARTED || subTree.dataStatus === macros.DATASTATUS_LOADING) {
			treeIsDone = false;

			// subTree is asigned to above, so need to keep another reference to this one for the async operation

			var currTree = subTree;
			q.defer(function (callback) {
				currTree.download(function (err, currTree) {
					callback(err)
				}.bind(this))
			}.bind(this))
		}
		else if (subTree.dataStatus == macros.DATASTATUS_DONE || subTree.dataStatus === macros.DATASTATUS_FAIL) {

			toProcess = toProcess.concat(subTree.coreqs.values).concat(subTree.prereqs.values)
			continue;
		}
		else {
			elog('wtf', subTree)
		}
	}


	q.awaitAll(function (err) {
		callback(err, treeIsDone)
	}.bind(this))
};


DownloadTree.prototype.fetchFullTree = function (tree, callback) {

	if (this.tree) {
		elog('already downloading a different tree', serverData)
	}

	this.tree = tree;

	this.counter = 0
	var treeIsDone = false;


	async.whilst(
		function () {
			return !treeIsDone;
		}.bind(this),
		function (callback) {
			this.increaseTreeDepth(tree, function (err, isDone) {
				treeIsDone = isDone;
				callback(err)
			}.bind(this))
		}.bind(this),
		function (err, n) {

			//another tree was began before this one finished
			if (this.tree != tree) {
				return callback('error different tree started before this one finished')
			}
			else {
				this.tree = null;
				return callback(null, tree);
			}
		}.bind(this)
	);
}



DownloadTree.prototype.DownloadTree = DownloadTree;
module.exports = new DownloadTree();
