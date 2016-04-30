'use strict';
// var Class = require('./mocks/mockClass') // NEED TO MAKE A MOCK HOST
var macros = require('../macros')
var Host = require('../Host')

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
	});
});
