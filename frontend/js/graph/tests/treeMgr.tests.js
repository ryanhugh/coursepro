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
require('es6-collections')
var treeMgr = require('../treeMgr')

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

describe('.getSubsets', function () {
	it('works', function () {

		setsAreEqual(new Set([
			[],
			[1],
			[2],
			[3],
			[1, 2],
			[2, 3],
			[1, 3],
			[1, 2, 3]
		]), treeMgr.getSubsets([1, 2, 3]))

	});
});
