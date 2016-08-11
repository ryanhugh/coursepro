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
