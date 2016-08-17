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
