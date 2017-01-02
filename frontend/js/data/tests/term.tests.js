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
var Term = require('../Term')
var macros = require('../../macros')
var _ = require('lodash')

describe('.compareTo', function () {
	it('works', function () {

		var terms = [
			Term.create({
				host: 'neu.edu',
				termId: '201630'
			}),
			Term.create({
				host: 'neu.edu',
				termId: '201710'
			})
		];

		terms.sort(function (a, b) {
			return a.compareTo(b);
		})

		expect(terms[0].termId).toBe('201710');
	});

});

describe('.download', function () {
	it('works', function (done) {

		var term = Term.create({ 
			host: 'neu.edu',
			termId: '201630'
		})

		term.download(function () {
			expect(term.text).toBe('Spring 2016')
			done()
		}.bind(this));
	});

});
