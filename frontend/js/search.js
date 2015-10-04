'use strict';

function Search () {
	

	this.isOpen = false;
	this.searchHelp = document.getElementById('searchHelp')
	this.container = document.getElementById('containerId')
	this.searchSubmitButton = document.getElementById('searchSubmitButton')
	this.searchIcon = document.getElementById("searchIcon")
	this.searchBox = document.getElementById('searchBox')


	//focus the box when the search button is clicked
	this.searchIcon.onclick = this.openSearchBox.bind(this)


	document.onclick = this.closeSearchBox.bind(this);


	this.searchBox.onkeypress = function(e){
		if (!e) e = window.event;
		var keyCode = e.keyCode || e.which;
		if (keyCode == '13'){
			this.searchFromEntry();
		}
	}.bind(this)

	this.searchSubmitButton.onclick = this.searchFromEntry.bind(this);
}
Search.prototype.closeSearchBox = function(event) {
	this.isOpen = false;
	$("#searchDropdown").parent().removeClass('open');
};


Search.prototype.openSearchBox = function(event) {
	
	search.isOpen = true;
	$("#searchDropdown").dropdown('toggle');//toggle only opens it and does not close it...


	var termText = selectors.getTermText();
	var subjectText = selectors.getSubjectText();


	if (!termText || !subjectText) {
		searchHelp.innerHTML = 'Select a term and subject <br> before searching!'
	}
	else {
		searchHelp.innerHTML = 'Search in '+selectors.getTermText() + '<br>'+selectors.getSubjectText()+'!'
	}

	setTimeout(function(){
		//close all the selectors
		selectors.closeAllSelectors();
		searchBox.focus();
		searchBox.select();
	}.bind(this),0);
	//


	if (event) {
		event.stopPropagation();
	};
};

Search.prototype.searchFromString = function(host,termId,subject,string) {
	if (!string) {
		return
	};
	this.searchBox.value = string;
	this.go(host,termId,subject,string);
};

Search.prototype.searchFromEntry = function() {
	var host = selectors.college.value;
	if (!host) {
		console.log('error: need to select college first');
		return
	}

	var termId = selectors.term.value;
	if (!termId) {
		console.log('error: need to selecte term first');
		return;
	}

	var subject = selectors.subject.value;
	if (!subject) {
		console.log('error: need to select subject first');
		return;
	};

	if (!searchBox.value) {
		console.log('error: empty box')
		return;
	};

	this.go(host,termId,subject,searchBox.value);
};



Search.prototype.go = function(host,termId,subject,value) {
	value=value.trim()
	if (!value) {
		return;
	};

	value=value.replace(/\s+/g,'').toLowerCase()
	
	window.location.hash = 'search/'+encodeURIComponent(host)+'/'+encodeURIComponent(termId)+'/'+encodeURIComponent(subject)+'/'+encodeURIComponent(value)

	//if found a class, open the class tree with the selectors and dont search for anything
	if (selectors.searchClasses(value)) {
		return;
	};



	ga('send', {
		'hitType': 'pageview',
		'page': window.location.href,
		'title': 'Coursepro.io'
	});

	console.log('searching for ',value)

	render.clearContainer()
	render.showSpinner()

	request({
		url:'/search',
		type:'POST',
		body:{
			host:host,
			termId:termId,
			subject:selectors.subject.value,
			value:value
		}
	},function (err,results) {
		console.log('found ',results.length,' classes!');


		//update the deeplink here
		if (results.length>0) {
			treeMgr.showClasses(results);
		}
		else {
			this.container.innerHTML = '<div style="font-size: 26px;">Nothing Found!</div>'
		}

	}.bind(this))
};



Search.prototype.Search=Search;
var instance = new Search();
window.search = instance;

