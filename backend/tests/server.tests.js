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

 var pointer = require('../server')
var needle = require('needle')


it('/getCurrentCollege works', function (done) {

	needle.post(
		'http://localhost:8123/getCurrentCollege', {
			ip: '155.33.17.68'
		}, {
			json: true
		},
		function (error, response, body) {

			body = JSON.parse(body)
			expect(body.host).toBe('neu.edu')
			done()
		}
	);
});



it('/getCurrentCollege works', function (done) {

	needle.post(
		'http://localhost:8123/getCurrentCollege', {
			ip: '129.10.116.51'
		}, {
			json: true
		},
		function (error, response, body) {

			body = JSON.parse(body)
			expect(body.host).toBe('neu.edu')
			done()
		}
	);
});


it('blocks if there is no ua', function (done) {

	needle.post('http://localhost:8123/listColleges', {}, {
		headers: {
			'User-Agent': ''
		}
	}, function (err, resp, body) {

		try {
			JSON.parse(body)
		}
		catch (e) {
			done()
			return;
		}

		expect('this case to have failed').toBe(null)
		done()
	}.bind(this))

});

it('blocks if there is no ua', function (done) {

	needle.post('http://localhost:8123/listColleges', {}, function (err, resp, body) {

		var results = JSON.parse(body)

		results.sort(function (a, b) {
			if (a.host < b.host) {
				return -1
			}
			else if (a.host > b.host) {
				return 1;
			}
			else {
				expect('should not be multiple with same host!')
				return 0
			}
		}.bind(this))


		expect(results[0].host).toBe('neu.edu/cps')
		expect(results[1].host).toBe('neu.edu/law')
		expect(results[2].host).toBe('swarthmore.edu')
		done()
	}.bind(this))

});


it('https works', function (done) {


	needle.post('https://localhost:8443/listColleges', {}, {

		// need this because the host isn't coursepro.io, but meh it at least checks some stuff is working
		rejectUnauthorized: false

		//resp.connection.getPeerCertificate().subject.O is the orginization that the cert was issued to
	}, function (err, resp, body) {
		expect(err).toBe(null);
		return done()
	}.bind(this))

});


it('filters bad objects', function (done) {

	needle.post('http://localhost:8123/listClasses', {
		$qe: ''
	}, {
		json: true
	}, function (err, resp, body) {
		expect(err).toBe(null);

		try {
			JSON.parse(body)
		}
		catch (e) {
			done()
			return;
		}

		expect('this case to have failed').toBe(null)
		done()
	}.bind(this))


});


it('list terms works', function (done) {

	needle.post('http://localhost:8123/listTerms', {
		host: 'neu.edu',
		termId: '201602'
	}, {
		json: true
	}, function (err, resp, body) {
		expect(err).toBe(null);
		var results = JSON.parse(body);
		expect(results.length).toBe(1);
		expect(results[0].host).toBe('neu.edu')
		done()
	}.bind(this))
});



it('list terms works', function (done) {

	needle.post('http://localhost:8123/listTerms', {
		host: 'neu.edu'
	}, {
		json: true
	}, function (err, resp, body) {
		expect(err).toBe(null);
		var results = JSON.parse(body);
		expect(results.length > 1).toBe(true);
		done()
	}.bind(this))
});
