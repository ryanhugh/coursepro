'use strict';

function Search () {
	

	this.isOpen = false;
	this.searchBox = document.getElementById("searchBox");
	this.searchHelp = document.getElementById('searchHelp')
	this.container = document.getElementById('containerId')
	this.searchSubmitButton = document.getElementById('searchSubmitButton')
	this.searchIcon = document.getElementById("searchIcon")
	this.searchBox = document.getElementById('searchBox')


	//focus the box when the search button is clicked
	this.searchIcon.onclick = this.openSearchBox.bind(this)


	document.onclick = function (event) {
		search.isOpen = false;
		$("#searchDropdown").parent().removeClass('open');
	}.bind(this)


	this.searchBox.onkeypress = function(e){
		if (!e) e = window.event;
		var keyCode = e.keyCode || e.which;
		if (keyCode == '13'){
			this.searchFromEntry();
		}
	}.bind(this)

	this.searchSubmitButton.onclick = this.searchFromEntry.bind(this);
}


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
	}.bind(this),0);
	//


	if (event) {
		event.stopPropagation();
	};
};

Search.prototype.searchFromString = function(host,termId,subject,string) {
	this.searchBox.value = string;
	// this.openSearchBox();
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
	
	window.location.hash = 'search/'+host+'/'+termId+'/'+subject+'/'+searchBox.value

	console.log('searching for ',searchBox.value)

	render.clearContainer()
	render.showSpinner()

	request({
		url:'/search',
		type:'POST',
		body:{
			host:host,
			termId:termId,
			subject:selectors.subject.value,
			value:searchBox.value
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

