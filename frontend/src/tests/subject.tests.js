'use strict';
var Subject = require('./mocks/mockSubject')
var macros = require('../macros')

describe('Subject', function () {

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
		it('works', function () {

			var host = new Subject({
				_id: '56f22160ea47044a0569872b'
			});

			host.download();

			expect(host.subject).toBe("GENS");
			expect(host.text).toBe("General Studies");
			expect(host.host).toBe("neu.edu");
			expect(host.termId).toBe("201710");

		});
	});

});
