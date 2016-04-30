'use strict';
var Term = require('./mocks/mockTerm')
var macros = require('../macros')

describe('Term', function () {

	describe('.compareTo', function () {
		it('works', function () {

			var terms = [
				new Term({host:'neu.edu',termId:'201630'}),
				new Term({host:'neu.edu',termId:'201710'})
			];
			
			terms.sort(function(a,b){
				return a.compareTo(b);
			})
			
			expect(terms[0].termId).toBe('201710');
		});

	});

	describe('.download', function () {
		it('works', function () {

			var term = new Term({host:'neu.edu',termId:'201630'})

			term.download();

			console.log(term)
			expect(term.text).toBe('Spring 2016')
		});

	});

});
