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
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var fs = require('fs')
var async = require('async')
var _ = require('lodash')
var queue = require('d3-queue').queue;
var URI = require('urijs')

var macros = require('./macros')

function EmailMgr() {



	//diff descriptions for sections and classes
	// Registration
	this.sectionAttrDescriptions = {
		crn: 'Class Registration Number',
		meetings: 'Time, Location, or/and Professor',
		seatsCapacity: 'Total number of seats in the class',
		seatsRemaining: 'Number of open seats in the class',
		waitCapacity: 'Total number of seats in the waitlist',
		waitRemaining: 'Number of open seats on the waitlist'
	}

	this.classAttrDescriptions = {
		desc: 'Class description',
		prereqs: 'Class prerequisites',
		coreqs: 'Class corequisites',
		credits: 'Class credits',
		name: 'Class Name',
		crns: 'CRNs of sections in this class'
	}

	this.fromEmail = 'notifications@coursepro.io'


	this.loadEmailPassword = async.memoize(function (callback) {
		fs.readFile('/etc/coursepro/emailPasswd', 'utf8', function (err, password) {
			if (err) {
				console.log('ERROR opening email password, disabling email mgr')
				return callback()
			}

			password = password.trim();

			if (this.transporter) {
				console.log("ERROR this.transporter already existed?");
			}

			this.transporter = nodemailer.createTransport(smtpTransport({
				host: 'mail.gandi.net',
				port: 587,
				auth: {
					user: this.fromEmail,
					pass: password
				}
			}));
			callback()

		}.bind(this))
	}.bind(this))
	this.loadEmailPassword(_.noop)
}


EmailMgr.prototype.sendEmail = function (toEmails, subject, html, callback) {
	if (!callback) {
		callback = function () {}
	};


	if (toEmails.length === 0) {
		return callback()
	};


	this.loadEmailPassword(function () {

		if (!this.transporter) {
			console.log("WARNING: not sending email because don't have email password", toEmails);
			console.log(subject)
			console.log(html)
			return callback();
		}

		if (!macros.PRODUCTION) {
			console.log('Not sending email to ', toEmails, ' because not in PRODUCTION mode');
			console.log(subject)
			console.log(html)
			return callback();
		}


		toEmails.forEach(function (toEmail) {

			toEmail = toEmail.trim();


			console.log('Sending email to ', toEmail);

			// send mail
			this.transporter.sendMail({
				from: this.fromEmail,
				to: toEmail,
				subject: subject,
				html: html
			}, function (err, info) {
				if (err) {
					console.log('ERROR sending email', toEmails, subject, html, err)
					return callback(err)
				}
				callback()

			}.bind(this));
		}.bind(this))
	}.bind(this))
}

EmailMgr.prototype.sendThanksForRegistering = function (toEmail) {

	this.sendEmail([toEmail], 'CoursePro.io - Thanks for registering!', 'We\'ll keep you updated on all the new awesome features! Check out the site <a href="http://coursepro.io">here!</a>')
}

EmailMgr.prototype.generateDBDataURL = function (dbData) {
	var url = []


	var urlParts = ['host', 'termId', 'subject', 'classUid'];

	for (var i = 0; i <= urlParts.length; i++) {
		if (dbData[urlParts[i]]) {
			url.push(dbData[urlParts[i]])
			url.push('/')
		}
		else {
			return url.join('')
		}
	}
};


EmailMgr.prototype.classDataToHTML = function (classData) {
	return this.printDBRow(classData);
};

EmailMgr.prototype.getUnsubscribeLink = function (user, row) {

	var retVal = new URI('https://coursepro.io/unsubscribe/')
	retVal.setQuery('host', row.host);
	retVal.setQuery('termId', row.termId);
	retVal.setQuery('subject', row.subject);
	retVal.setQuery('classUid', row.classUid);
	retVal.setQuery('email', user.email);
	retVal.setQuery('unsubscribeKey', user.unsubscribeKey);
	return retVal.toString()
}

EmailMgr.prototype.sendSectionUpdatedEmail = function (users, oldData, newData, diff) {
	if (!diff) {
		console.log('ERROR no diff in send section update email?')
		return;
	};
	var email = [];

	diff.forEach(function (diffAttr) {
		var diffDescription = this.sectionAttrDescriptions[diffAttr.path[0]]
		if (!diffDescription) {
			return;
		}

		var toAdd = diffDescription + ' changed<br>'

		if (!_(email).includes(toAdd)) {
			email.push(toAdd)
			console.log('DIFF of class/section:', diffAttr)
		}
	}.bind(this))

	if (email.length === 0) {
		console.log("Only properties not whitelisted changed, not sending email");
		return;
	}


	email.push('<br><a href="https://coursepro.io/#' + this.generateDBDataURL(newData) + '">View on CoursePro.io</a>')

	users.forEach(function (user) {

		var userSpecificEmail = email.slice(0)

		userSpecificEmail.push('<br><br>Want to unsubscribe? <a href="' + this.getUnsubscribeLink(user, newData) + '">Click here</a>')
		this.sendEmail([user.email], 'A section in ' + newData.subject + ' ' + newData.classId + ' was changed - CoursePro.io', userSpecificEmail.join(''))

	}.bind(this))

	// email.push('And in case you\'re wondering, here is the section before and after the change:<br>\n')

	// email.push(this.sectionDataToHTML(oldData))
	// email.push('After:<br>\n')
	// email.push(this.sectionDataToHTML(newData))

};

EmailMgr.prototype.sendClassUpdatedEmail = function (users, oldData, newData, diff) {
	if (!diff) {
		console.log('ERROR no diff in send class update email?')
		return;
	};
	var email = [];

	diff.forEach(function (diffAttr) {
		var diffDescription = this.classAttrDescriptions[diffAttr.path[0]]
		if (!diffDescription) {
			return;
		}

		var toAdd = diffDescription + ' changed<br>'

		if (!_(email).includes(toAdd)) {
			email.push(diffDescription + ' changed<br>')
		}
	}.bind(this))

	if (email.length === 0) {
		console.log("Only properties not whitelisted changed, not sending email");
		return;
	}

	email.push('<br><a href="https://coursepro.io/#' + this.generateDBDataURL(newData) + '">View on CoursePro.io</a>')


	users.forEach(function (user) {

		var userSpecificEmail = email.slice(0);

		userSpecificEmail.push('<br><br>Want to unsubscribe? <a href="' + this.getUnsubscribeLink(user, newData) + '">Click here</a>')
		this.sendEmail([user.email], newData.subject + ' ' + newData.classId + ' was changed - CoursePro.io', userSpecificEmail.join(''))

	}.bind(this))


}


EmailMgr.prototype.tests = function () {

	this.sendEmail(['rysquash@gmail.com'], 'CS 4800 was changed - CoursePro.io', 'Number of open seats in the class changed<br><br><a href="https://coursepro.io/#neu.edu/201630/ENGW/1111/">View on CoursePro.io</a>')
	this.loadEmailPassword(_.noop)
	this.loadEmailPassword(_.noop)
}


EmailMgr.prototype.EmailMgr = EmailMgr;
module.exports = new EmailMgr();


if (require.main === module) {
	module.exports.tests();
}
