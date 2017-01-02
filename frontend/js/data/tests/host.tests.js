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
var Host = require('../Host')
var macros = require('../../macros')
var _ = require('lodash')

describe('.compareTo', function () {
	it('works', function () {

		var hosts = [
			Host.create({
				host: 'neu.edu',
				title: 'Northeastern University'
			}),
			Host.create({
				host: 'zzzzz',
				title: 'ZZZZZ'
			})
		];

		hosts.sort(function (a, b) {
			return a.compareTo(b);
		})

		expect(hosts[0].host).toBe('neu.edu');
	});

	it('works', function () {

		var hosts = [
			Host.create({
				host: 'neu.edu',
				title: 'ZZZZZ'
			}),
			Host.create({
				host: 'aaaa',
				title: 'ZZZZZ'
			})
		];

		hosts.sort(function (a, b) {
			return a.compareTo(b);
		})

		expect(hosts[0].host).toBe('aaaa');
	});
});


describe('.download', function () {
	it('works', function (done) {

		var host = Host.create({
			host: 'neu.edu'
		});

		host.download(_.noop);
		host.download(_.noop);
		host.download(_.noop);
		host.download(function () {
			expect(host.title).toBe('Northeastern University')
			done()
		}.bind(this));
	});
});
