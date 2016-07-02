'use strict';
var Host = require('../Host')
var macros = require('../macros')
var _ = require('lodash')

describe('Host', function () {

	describe('.compareTo', function () {
		it('works', function () {

			var hosts = [
				new Host({
					host: 'neu.edu',
					title: 'Northeastern University'
				}),
				new Host({
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
				new Host({
					host: 'neu.edu',
					title: 'ZZZZZ'
				}),
				new Host({
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

			var host = new Host({
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

});
