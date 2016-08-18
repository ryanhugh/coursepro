'use strict';
var Subject = require('../Subject')
var macros = require('../../macros')
var _ = require('lodash')

describe('.compareTo', function () {
	it('works', function () {

		var subjects = [
			Subject.create({
				subject: 'AAA',
				text: 'Computer Science',
				host: 'neu.edu',
				termId: '201710'
			}),
			Subject.create({
				subject: 'EECE',
				text: 'Electronics or something',
				host: 'neu.edu',
				termId: '201710'
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

		var subject = Subject.create({
			"host": "neu.edu",
			"termId": "201710",
			"subject": "GENS"
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
