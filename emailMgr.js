'use strict';
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var fs = require('fs')

function EmailMgr () {
	
	var password = fs.readFileSync('/etc/coursepro/passwd').toString().trim();
	
	this.transporter = nodemailer.createTransport(smtpTransport({
	    host: 'mail.gandi.net',
	    port: 25,
	    auth: {
	        user: 'ryan@coursepro.io',
	        pass: password
	    }
	}));
}


EmailMgr.prototype.sendThanksForRegistering = function (toEmail) {
	
	toEmail = toEmail.trim();
	
	console.log('Sending email to ',toEmail);
	
	// send mail
	this.transporter.sendMail({
	    from: 'ryan@coursepro.io',
	    to: toEmail,
	    subject: 'Thanks for registering!',
	    text: 'YOOOOOOOO'
	});

}

EmailMgr.prototype.sendEmails = function(pageData,emailData) {
	if (!emailData) {
		return;
	};
	console.log('ERROR send email was called??/')
	
	// console.log('Sending email to ',pageData.dbData.emails)

	// transporter.sendMail({
	//     from: 'coursenotifyer@gmail.com',
	//     to: pageData.dbData.emails,
	//     subject: emailData.title,
	//     html: '<a href="'+pageData.dbData.url+'"><div style="font-size:100px">Link!</div></a>'
	// });

};

EmailMgr.prototype.EmailMgr=EmailMgr;
module.exports = new EmailMgr();