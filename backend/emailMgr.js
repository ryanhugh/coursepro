'use strict';
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var fs = require('fs')
var _ = require('lodash')

var macros = require('./macros')

function EmailMgr() {



	//diff descriptions for sections and classes
	// Registration
	this.sectionAttrDescriptions = {
		crn: 'Class Registration Number',
		meetings: 'Time, Location, or/and Professor',
		seatsCapacity: 'Total number of seats in the class',
		seatsRemaining: 'Number of open seats in the classes',
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


	var password;

	try {
		password = fs.readFileSync('/etc/coursepro/passwd');
	}
	catch (e) {
		if (e.code = 'ENOENT') {
			console.log("WARNING: can't find password file, disabling email mgr");
		}
		else {
			console.log('ERROR', e);
		}
		return;
	}


	password = password.toString().trim();

	this.transporter = nodemailer.createTransport(smtpTransport({
		host: 'mail.gandi.net',
		port: 25,
		auth: {
			user: 'ryan@coursepro.io',
			pass: password
		}
	}));
}


EmailMgr.prototype.sendEmail = function (toEmails, subject, html) {
	if (!this.transporter) {
		console.log("WARNING: not sending email because don't have email password", toEmails);
		console.log(subject)
		console.log(html)
		return;
	}

	if (!macros.SEND_EMAILS) {
		console.log('Not sending email to ', toEmails, ' because in test mode');
		return;
	}


	toEmails.forEach(function (toEmail) {

		toEmail = toEmail.trim();


		console.log('Sending email to ', toEmail);

		// send mail
		this.transporter.sendMail({
			from: 'ryan@coursepro.io',
			to: toEmail,
			subject: subject,
			html: html
		});
	}.bind(this))
};

EmailMgr.prototype.sendThanksForRegistering = function (toEmail) {

	this.sendEmail([toEmail], 'CoursePro.io - Thanks for registering!', 'We\'ll keep you updated on all the new awesome features! Check out the site <a href="http://coursepro.io">here!</a>')
}

EmailMgr.prototype.generateDBDataURL = function (dbData) {
	var url = ['https://coursepro.io/#']


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
			html.push('<a href="' + this.generateDBDataURL(dbData) + '">View on CoursePro.io</a>')
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
			diffSummary.push(diffDescription + ' changed<br>')
		}
	}.bind(this))


	email.push('<a href="' + this.generateDBDataURL(newData) + '">View on CoursePro.io</a>')

	this.sendEmail(toEmails, 'A section you\'re watching was changed!', email.join(''))

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

	email.push('<a href="' + this.generateDBDataURL(newData) + '">View on CoursePro.io</a>')

	this.sendEmail(toEmails, 'A class you\'re watching was changed!', email.join(''))

}


EmailMgr.prototype.tests = function () {

}


EmailMgr.prototype.EmailMgr = EmailMgr;
module.exports = new EmailMgr();