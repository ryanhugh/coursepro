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
var treeMgr = require('../../graph/treeMgr')
var Node = require('../../graph/Node')
var Class = require('../../data/Class')
var downloadTree = require('../../graph/downloadTree')

it('makes sure fetchFullTree is constant on constant data', function (done) {

	downloadTree.fetchFullTree(Class.create({
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
		classUid: "4750_1045395676",
	}), function (err, tree) {
		expect(err).toBe(null);

		var rootNode = Node.create(tree);

		treeMgr.go(rootNode)

		// This used to be 13 before the prereqs of unselected nodes were removed
		expect(treeMgr.countClassesInTree(rootNode)).toBe(4);
		done()
	}.bind(this))

});
