'use strict';
var Subject = require('../Subject')
var macros = require('../macros')
var _ = require('lodash')

describe('.compareTo', function () {
	it('works', function () {

		var subjects = [
			new Subject({
				subject: 'AAA',
				text: 'Computer Science'
			}),
			new Subject({
				subject: 'EECE',
				text: 'Electronics or something'
			})
		];

		subjects.sort(function (a, b) {
			return a.compareTo(b);
		})

		expect(subjects[0].subject).toBe('AAA');
	});
});


describe('.download', function () {
	it('works', function (done) {

		var subject = new Subject({
			_id: '56f22160ea47044a0569872b'
		});

		subject.download(function (err) {

			expect(subject.subject).toBe("GENS");
			expect(subject.text).toBe("General Studies");
			expect(subject.host).toBe("neu.edu");
			expect(subject.termId).toBe("201710");
			done()

		}.bind(this));
	});
});
