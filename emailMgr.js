'use strict';
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'coursenotifyer@gmail.com',
        pass: 'coursenotifyer890'
    }
});



function EmailMgr () {
	
}


EmailMgr.prototype.sendEmails = function(pageData,emailData) {
	if (!emailData) {
		return;
	};
	
	console.log('Sending email to ',pageData.dbData.emails)

	transporter.sendMail({
	    from: 'coursenotifyer@gmail.com',
	    to: pageData.dbData.emails,
	    subject: emailData.title,
	    html: '<a href="'+pageData.dbData.url+'"><div style="font-size:100px">Link!</div></a>'
	});

};

EmailMgr.prototype.EmailMgr=EmailMgr;
module.exports = new EmailMgr();