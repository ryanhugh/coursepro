'use strict';


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
			reason:data.seatsRemaining + ' open seats found in '+ data.name + ' ('+data.seatsCapacity + ' total seats)'
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



	urlStatusLabel.classList.add(reasonDict[data.reason].labelClass)
	urlStatusLabel.innerHTML=reasonDict[data.reason].labelText;
	urlStatusLabel.style.visibility="visible";


	urlStatusDetails.innerHTML=reasonDict[data.reason].reason;
	urlStatusDetails.style.visibility="visible";

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


	if (!inputText.startsWith('https://') && !inputText.startsWith('http://')) {
		inputText='http://'+inputText
	};


	console.log(inputText)

	//cancel prior request
	if (xmlhttp) {
		xmlhttp.abort();
	};
	if (fireRequestTimeout) {
		clearTimeout(fireRequestTimeout);
	};

	setUrlStatus({reason:'LOADING'})

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
			resData.hostname = extractDomain(inputText)
			setUrlStatus(resData);



	        //[green] Success!  '5 sections of %s found (1 with open spots)'
	        //[yellow] Hmmm... %s is not supported at the moment. Want to add support for it on github?
	        
	    }
	}
	xmlhttp.open("POST", location.protocol + '//' + location.host+'/urlDetails', true);
	xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

	fireRequestTimeout=setTimeout(function () {
		console.log('fireing request!');
		xmlhttp.send(JSON.stringify({url:inputText}));
	},200);
}

// http://stackoverflow.com/a/46181/11236
// this is also done server side
function validateEmail(email) { 
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}


var emailDelayTimer;
var lastEmailValue;
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
		}
		else {
			statusElement.innerHTML = "Looks Good!"
			statusElement.className = 'label label-success';
		}
	},500);
}