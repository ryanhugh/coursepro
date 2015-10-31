'use strict';
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var fs = require('fs')

function EmailMgr () {

	
	var password;

    try {
        password = fs.readFileSync('/etc/coursepro/passwd');
    }
    catch (e) {
    	if (e.code='ENOENT') {
    		console.log("WARNING: can't find password file, disabling email mgr");
    	}
    	else {
    		console.log('ERROR',e);
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


EmailMgr.prototype.sendThanksForRegistering = function (toEmail) {
	
	toEmail = toEmail.trim();
	

	if (this.transporter) {
		console.log('Sending email to ',toEmail);
	}
	else {
		console.log("WARNING: not sending email because don't have email password",toEmail);
		return;
	}
	
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

};

EmailMgr.prototype.EmailMgr=EmailMgr;
module.exports = new EmailMgr();