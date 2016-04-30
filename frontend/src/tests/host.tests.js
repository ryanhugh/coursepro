'use strict';
var Host = require('./mocks/mockHost')
var macros = require('../macros')

describe('Host', function () {

	describe('.compareTo', function () {
		it('works', function () {

			var hosts = [
				new Host({host:'neu.edu',title:'Northeastern University'}),
				new Host({host:'zzzzz',title:'ZZZZZ'})
			];
			
			hosts.sort(function(a,b){
				return a.compareTo(b);
			})
			
			expect(hosts[0].host).toBe('neu.edu');
		});

		it('works', function () {

			var hosts = [
				new Host({host:'neu.edu',title:'ZZZZZ'}),
				new Host({host:'aaaa',   title:'ZZZZZ'})
			];
			
			hosts.sort(function(a,b){
				return a.compareTo(b);
			})
			
			expect(hosts[0].host).toBe('aaaa');
		});
	});


	describe('.download', function () {
		it('works', function () {

			var host = new Host({host:'neu.edu'});

			host.download();

			expect(host.title).toBe('Northeastern University')

		});
	});

});
