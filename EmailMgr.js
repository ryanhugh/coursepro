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


EmailMgr.prototype.sendEmails = function(emailData) {
	
	console.log('Sending email to ',emailData.emails)

	transporter.sendMail({
	    from: 'coursenotifyer@gmail.com',
	    to: emailData.emails,
	    subject: emailData.title,
	    html: '<a href="'+emailData.url+'"><div style="font-size:100px">Link!</div></a>'
	});

};

EmailMgr.prototype.getOptionallyPlural = function(num) {
	if (num>1) {
		return 'seats'
	}
	else {
		return 'seat'
	}
};


EmailMgr.prototype.onDbDataUpdate = function(dbData,newData) {

	if (dbData.emails.length==0) {
		return;
	};
	
	// spot opened on wait list
	if (newData.waitRemaining>dbData.waitRemaining && newData.waitRemaining>0) {
		var newSeatsOpen = (newData.waitRemaining-dbData.waitRemaining);
		this.sendEmails( 
		{
			title:newSeatsOpen + ' '+this.getOptionallyPlural(newSeatsOpen)+' opened on wait list for '+dbData.name+'!',
			url:dbData.url,
			emails:dbData.emails
		});
	}

	//spot opened on class
	if (newData.seatsRemaining>dbData.seatsRemaining && newData.seatsRemaining>0) {

		var newSeatsOpen = (newData.seatsRemaining-dbData.seatsRemaining);

		this.sendEmails( 
		{
			title:newSeatsOpen + ' '+this.getOptionallyPlural(newSeatsOpen)+' opened for '+dbData.name+'!',
			url:dbData.url,
			emails:dbData.emails
		});
	};
};


module.exports = EmailMgr;