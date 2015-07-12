'use strict';

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

	if (data.hostname && data.hostname.startsWith('www.')) {
		data.hostname=data.hostname.substr(4)
	};

	var reasonDict = {
		'SERVERDOWN': 
		{
			labelClass:'label-warning',
			labelText:'Warning',
			reason:"Uh oh! Couln't connect to the server..."
		},
		'LOADING': 
		{
			labelClass:'label-default',
			labelText:'Loading...',
			reason:""
		},
		'ENOTFOUND': {
			labelClass:'label-danger',
			labelText:'Uh Oh!',
			reason:data.hostname+ ' was not found.'

		},
		'NOSUPPORT':{
			labelClass:'label-warning',
			labelText:'Warning',
			reason:'Hmmm... '+data.hostname+' is not supported at the moment. Want to add support for it on github?'
		}
	}



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