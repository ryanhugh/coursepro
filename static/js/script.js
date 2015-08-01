'use strict';

function updateSubmitButton () {
	if (emailStatus=="SUCCESS" && urlStatus=="SUCCESS") {
		document.getElementById('submitbutton').removeAttribute('disabled');
	}
	else {
		document.getElementById('submitbutton').setAttribute('disabled',true);
	}
}


function extractDomain(url) {
	var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
    	domain = url.split('/')[2];
    }
    else {
    	domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    //remove "www."
    if (domain.startsWith('www.')) {
    	domain=domain.substr(4)
    };

    return domain;
}


var urlStatus;
function setUrlStatus (data) {
	var urlEntry = document.getElementById('urlEntry');
	var urlStatusDetails = document.getElementById('urlStatusDetails');
	var urlStatusLabel = document.getElementById('urlStatusLabel');


	if (urlEntry.value=='') {
		urlStatusLabel.style.visibility="hidden";
		urlStatusDetails.style.visibility="hidden";
		return;
	}

	urlStatusLabel.className = 'label';

	
	var reasonDict = {
		'LOADING': 
		{
			labelClass:'label-default',
			labelText:'Loading...',
			reason:""
		},
		'SUCCESS':
		{
			labelClass:'label-success',
			labelText:'Huzzah!',
			reason:data.clientString
		},
		'SERVERDOWN': 
		{
			labelClass:'label-warning',
			labelText:'Uh oh!',
			reason:"Couln't connect to the server..."
		},
		'NOSUPPORT':
		{
			labelClass:'label-warning',
			labelText:'Warning',
			reason:'Hmmm... '+data.hostname+' is not supported at the moment. Want to add support for it on github?'
		},
		'ENOTFOUND': 
		{
			labelClass:'label-danger',
			labelText:'Uh Oh!',
			reason:data.hostname+ ' was not found.'
		},
		'NOUPDATE': 
		{
			labelClass:'label-warning',
			labelText:'Uh Oh!',
			reason:data.hostname+ ' could not be updated.'
		},
		'UNKNOWN':
		{
			labelClass:'label-default',
			labelText:'...',
			reason:'Something bad happened... (unknown state '+data.reason+')'
		}
	}

	if (!reasonDict[data.reason]) {
		data.reason='UNKNOWN'
	};

	urlStatus = data.reason;
	updateSubmitButton()


	urlStatusLabel.classList.add(reasonDict[data.reason].labelClass)
	urlStatusLabel.innerHTML=reasonDict[data.reason].labelText;
	urlStatusLabel.style.visibility="visible";


	urlStatusDetails.innerHTML=reasonDict[data.reason].reason;
	urlStatusDetails.style.visibility="visible";

}


function sendRequest (fromSubmitButton) {
	var urlText = document.getElementById('urlEntry').value;
	var emailText = document.getElementById('emailEntry').value;


	if (!urlText.startsWith('https://') && !urlText.startsWith('http://')) {
		urlText='http://'+urlText
	};



	//cancel prior request
	if (xmlhttp) {
		xmlhttp.abort();
	};
	if (fireRequestTimeout) {
		clearTimeout(fireRequestTimeout);
	};


	xmlhttp.onerror = function (error) {
		console.log('error..',error)
		setUrlStatus({reason:'SERVERDOWN'})
	}

	xmlhttp.onreadystatechange = function() {
		if (!(xmlhttp.readyState == 4)) {
			return;
		}
		if (xmlhttp.status != 200) {
			setUrlStatus({reason:'SERVERDOWN'})
		}
		else {
			console.log(xmlhttp.responseText);
			var resData = JSON.parse(xmlhttp.responseText);
			resData.hostname = extractDomain(urlText)
			setUrlStatus(resData);
	    }
	}
	xmlhttp.open("POST", location.protocol + '//' + location.host+'/urlDetails', true);
	xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

	fireRequestTimeout=setTimeout(function () {

		var data = {url:urlText};
		if (fromSubmitButton) {
			data.email = emailText;
		}
		console.log('firing request!',data);


		xmlhttp.send(JSON.stringify(data));
	},200);

}



var lastValue = '';
var xmlhttp = new XMLHttpRequest();
var fireRequestTimeout;
function onURLChange (inputField) {
	var inputText=inputField.value.trim()

	if (inputText===lastValue) {
		return;
	};
	lastValue=inputText;

	console.log(inputText)
	setUrlStatus({reason:'LOADING'})
	sendRequest(false);
}

// http://stackoverflow.com/a/46181/11236
// this is also done server side
function validateEmail(email) { 
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}


var emailDelayTimer;
var lastEmailValue;
var emailStatus;
function onEmailChange (inputField) {
	var inputText=inputField.value.trim()

	if (inputText===lastEmailValue) {
		return;
	};
	lastEmailValue=inputText;



	if (emailDelayTimer) {
		clearTimeout(emailDelayTimer)
	}

	var statusElement = document.getElementById('emailStatusLabel');
	statusElement.style.visibility = 'hidden'

	emailDelayTimer= setTimeout(function (){

		var email = inputField.value.trim();

		if (email.length==0) {
			statusElement.style.visibility = 'hidden'
		}
		else {
			statusElement.style.visibility = 'visible'
		}



		if (!validateEmail(email)) {
			statusElement.className = 'label label-danger';
			statusElement.innerHTML = "Uh Oh!"
			emailStatus = "ERROR"
		}
		else {
			emailStatus = "SUCCESS"
			statusElement.innerHTML = "Looks Good!"
			statusElement.className = 'label label-success';
		}
		updateSubmitButton()
	},500);
}


function onSubmit () {
	sendRequest(true);
}