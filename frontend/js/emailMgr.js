
function EmailMgr () {

}


// http://stackoverflow.com/a/46181/11236
// this is also done client side
EmailMgr.prototype.validateEmail = function(email) {
	if (!email) {
		return false;
	};

	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	if (!re.test(email)) {
		console.log('email failed regex',email)
		return false;
	}
	
	return true;
}




EmailMgr.prototype.submitTo = function(url,callback) {
	
	
	var box=document.getElementById('emailBoxId');
	var email = box.value.trim();
	
	if (!this.validateEmail(email)) {
		console.log(email,'is not an email address!');
		
		
		//show some warning in the html
		
		return;
	}

	
	console.log('email submitted:',email);

	request({
		url:url,
		body:{
			email:email
		}
	},function (err,responce) {
		if (err) {
			
			//server error, probably will not happen but can be a bunch of different stuff
			console.log(err);
			
			//display some warning in the html
			// sometimes the returned err is not pretty, so just say "A server error occured :/" or something
			return callback('error');
		}
		
		else if (responce.error) {
			
			//some other errors are possible - same thing as above
			console.log(responce.error)
			return callback('error');
		}
		
		else {
			console.log('it worked!')
			return callback();
		}
		
	}.bind(this))
};




EmailMgr.prototype.onEmailSubmit = function(email) {

	this.submitTo('/registerForEmails',function (err) {

		if (err) {
				//do something
		}
		else {
			// document.body.innerHTML+='<br>subscribe successful!'
		}
		
	}.bind(this))

}


EmailMgr.prototype.onEmailUnsubscribe = function(email) {

	this.submitTo('/unsubscribe',function (err) {

		if (err) {
				//do something
		}
		else {
			// document.body.innerHTML+='<br>unsubscribe successful!'
		}
		
	}.bind(this))
}




EmailMgr.prototype.EmailMgr=EmailMgr;
window.emailMgr = new EmailMgr();
