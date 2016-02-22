'use strict';
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var fs = require('fs')
var _ = require('lodash')
var queue = require('d3-queue').queue;

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

	this.emailPasswdQueue = queue()

	this.emailPasswdQueue.defer(function (callback) {
		fs.readFile('/etc/coursepro/emailPasswd', 'utf8', function (err, password) {
			if (err) {
				console.log('ERROR opening email password, disabling email mgr')
				return callback()
			}

			password = password.trim();

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
}


EmailMgr.prototype.sendEmail = function (toEmails, subject, html, callback) {
	if (!callback) {
		callback = function () {}
	};


	if (toEmails.length === 0) {
		return callback()
	};


	this.emailPasswdQueue.awaitAll(function () {

		if (!this.transporter) {
			console.log("WARNING: not sending email because don't have email password", toEmails);
			console.log(subject)
			console.log(html)
			return;
		}

		if (!macros.SEND_EMAILS) {
			console.log('Not sending email to ', toEmails, ' because not in PRODUCTION mode');
			console.log(subject)
			console.log(html)
			return;
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


	var urlParts = ['host', 'termId', 'subject', 'classId'];

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

EmailMgr.prototype.printDBRow = function (dbData) {
	console.log('Something called printDBRow, but this function isnt done yet!')
	console.trace()
	return;

	var html = [];
	for (var attrName in dbData) {
		if (!dbData[attrName]) {
			continue;
		}
		if (!this.classAttrDescriptions[attrName]) {
			continue;
		}

		html.push(this.classAttrDescriptions[attrName] + ': ')

		// basic data type, print the data
		if (_(['number', 'string', 'boolean']).includes(typeof (dbData[attrName]))) {
			html.push(dbData[attrName])
		}
		else if (Array.isArray(dbData[attrName])) {
			var arrayDescription = [];

			dbData[attrName].forEach(function (obj) {


			}.bind(this))
		}
		else {
			html.push('<a href="https://coursepro.io/#' + this.generateDBDataURL(dbData) + '">View on CoursePro.io</a>')
		}
		html.push('<br>\n')
	}

	return html.join('');

};

EmailMgr.prototype.classDataToHTML = function (classData) {
	return this.printDBRow(classData);
};

EmailMgr.prototype.sendSectionUpdatedEmail = function (toEmails, oldData, newData, diff) {
	if (!diff) {
		console.log('ERROR no diff in send section update email?')
		return;
	};
	var email = [];

	diff.forEach(function (diffAttr) {
		var diffDescription = this.sectionAttrDescriptions[diffAttr.path[0]]
		if (diffDescription) {
			email.push(diffDescription + ' changed<br>')
			console.log('DIFF of class/section:', diffAttr)
		}
	}.bind(this))


	email.push('<br><a href="https://coursepro.io/#' + this.generateDBDataURL(newData) + '">View on CoursePro.io</a>')

	email.push('<br><br>Want to unsubscribe? <a href="https://coursepro.io/#unsubscribe/' + this.generateDBDataURL(newData) + '">Click here</a>')

	this.sendEmail(toEmails, 'A section in ' + newData.subject + ' ' + newData.classId + ' was changed - CoursePro.io', email.join(''))

	// email.push('And in case you\'re wondering, here is the section before and after the change:<br>\n')

	// email.push(this.sectionDataToHTML(oldData))
	// email.push('After:<br>\n')
	// email.push(this.sectionDataToHTML(newData))

};

EmailMgr.prototype.sendClassUpdatedEmail = function (toEmails, oldData, newData, diff) {
	if (!diff) {
		console.log('ERROR no diff in send class update email?')
		return;
	};
	var email = [];

	diff.forEach(function (diffAttr) {
		var diffDescription = this.classAttrDescriptions[diffAttr.path[0]]
		if (diffDescription) {
			email.push(diffDescription + ' changed<br>')
		}
	}.bind(this))

	email.push('<br><a href="https://coursepro.io/#' + this.generateDBDataURL(newData) + '">View on CoursePro.io</a>')

	email.push('<br><br>Want to unsubscribe? <a href="https://coursepro.io/#unsubscribe/' + this.generateDBDataURL(newData) + '">Click here</a>')

	this.sendEmail(toEmails, newData.subject + ' ' + newData.classId + ' was changed - CoursePro.io', email.join(''))

}


EmailMgr.prototype.tests = function () {

	this.sendEmail(['rysquash@gmail.com'], 'CS 4800 was changed - CoursePro.io', 'Number of open seats in the class changed<br><br><a href="https://coursepro.io/#neu.edu/201630/ENGW/1111/">View on CoursePro.io</a>')
}


EmailMgr.prototype.EmailMgr = EmailMgr;
module.exports = new EmailMgr();


if (require.main === module) {
	module.exports.tests();
}
