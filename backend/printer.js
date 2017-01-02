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

'use strict';
var request = require('request');
var memoize = require('../common/memoize')
var fs = require('fs')

// This is the backend for http://neuprint.org/
// When you go to that site and click share printer, this is the code that interacts with the Google API 
// and shares the printer. 


function Printer() {

}

Printer.PRINT_CLOUD_URL = 'https://www.google.com/cloudprint/'


Printer.prototype.loadSecrets = memoize(function (callback) {
	fs.readFile('/etc/coursepro/config.json', 'utf8', function (err, data) {
		if (err) {
			console.log('ERROR reading config.json', err);
			return callback(err);
		}
		return callback(null, JSON.parse(data));
	}.bind(this));
});


Printer.prototype.go = function (email, callback) {
	this.loadSecrets(function (err, config) {
		if (err) {
			return callback(err)
		}

		request.post({
			url: 'https://accounts.google.com/o/oauth2/token',
			form: {
				'client_id': config.client_id,
				'client_secret': config.client_secret,
				'grant_type': 'refresh_token',
				'refresh_token': config.refresh_token,
			}
		}, function (err, httpResponse, body) {
			if (err) {
				return callback(err)
			}
			var token = JSON.parse(body).access_token;

			request.post({
				url: Printer.PRINT_CLOUD_URL + 'list',
				form: {
					'output': 'json',
					'proxy': 'HI GOOGLE!!1 :D',
				},
				headers: {
					'Authorization': 'Bearer ' + token
				}
			}, function (err, resp, body) {
				if (err) {
					return callback(err)
				}
				var xsrf = JSON.parse(body).xsrf_token;
				request.post({
					url: Printer.PRINT_CLOUD_URL + 'share',
					form: {
						'printerid': config.printer_id,
						'scope': email + '@husky.neu.edu',
						'role': 'USER',
						'xsrf': xsrf
					},
					headers: {
						'Authorization': 'Bearer ' + token
					}
				}, function (err, resp, body) {
					if (err) {
						return callback(err)
					}

					var message = JSON.parse(body).message;

					console.log(message + email);
					return callback();
				}.bind(this))
			}.bind(this))
		}.bind(this))
	}.bind(this))
};

module.exports = new Printer();
