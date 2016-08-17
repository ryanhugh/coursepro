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
