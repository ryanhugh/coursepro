'use strict';
var request = require('./request')
var graph = require('./graph')


function Search() {


	this.isOpen = false;
	this.searchHelp = document.getElementById('searchHelp')
	this.container = document.getElementById('containerId')
	this.searchSubmitButton = document.getElementById('searchSubmitButton')
	this.searchIcon = document.getElementById("searchIcon")
	this.searchBox = document.getElementById('searchBox')


	//focus the box when the search button is clicked
	// this.searchIcon.onclick = this.openSearchBox.bind(this)


	// document.onclick = this.closeSearchBox.bind(this);


	// this.searchBox.onkeypress = function (e) {
	// 	if (!e) e = window.event;
	// 	var keyCode = e.keyCode || e.which;
	// 	if (keyCode == '13') {
	// 		this.searchFromEntry();
	// 	}
	// }.bind(this)

	// this.searchSubmitButton.onclick = this.searchFromEntry.bind(this);
}
Search.prototype.closeSearchBox = function (event) {
	this.isOpen = false;
	$("#searchDropdown").parent().removeClass('open');
};


Search.prototype.openSearchBox = function (event) {

	this.isOpen = true;
	$("#searchDropdown").dropdown('toggle'); //toggle only opens it and does not close it...


	var termText = selectorsMgr.term.getText();
	var subjectText = selectorsMgr.subject.getText();


	if (!termText || !subjectText) {
		this.searchHelp.innerHTML = 'Select a term and subject <br> before searching!'
	}
	else {
		this.searchHelp.innerHTML = 'Search in ' + termText + '<br>' + subjectText + '!'
	}


	this.searchBox.focus();
	this.searchBox.select();


	if (event) {
		event.stopPropagation();
	};
};

Search.prototype.updateHash = function (host, termId, subject, value) {

	var hash = 'search/' + encodeURIComponent(host) + '/' + encodeURIComponent(termId) + '/' + encodeURIComponent(subject) + '/' + encodeURIComponent(value)

	if (history.pushState) {
		history.pushState(null, null, "#" + hash);
	}
	else {
		window.location.hash = hash
	}
}

Search.prototype.searchFromString = function (host, termId, subject, string) {
	if (!string) {
		return
	};
	this.searchBox.value = string;
	this.go(host, termId, subject, string);
};

Search.prototype.searchFromEntry = function () {
	var host = selectorsMgr.college.getValue();
	if (!host) {
		console.log('error: need to select college first');
		return
	}

	var termId = selectorsMgr.term.getValue();
	if (!termId) {
		console.log('error: need to selecte term first');
		return;
	}

	var subject = selectorsMgr.subject.getValue();
	if (!subject) {
		console.log('error: need to select subject first');
		return;
	};

	if (!this.searchBox.value) {
		console.log('error: empty box')
		return;
	};

	this.updateHash(host, termId, subject, this.searchBox.value);

	this.go(host, termId, subject, this.searchBox.value);
};



Search.prototype.go = function (host, termId, subject, value) {
	value = value.trim()
	if (!value) {
		return;
	};

	value = value.replace(/\s+/g, '').toLowerCase()


	//if found a class, open the class tree with the selectorsMgr and dont search for anything
	if (selectorsMgr.searchClasses(value)) {
		this.closeSearchBox();
		return;
	};


	ga('send', {
		'hitType': 'pageview',
		'page': window.location.href,
		'title': 'Coursepro.io'
	});

	console.log('searching for ', value)

	graph.beforeLoad()
	
	request({
		url: '/search',
		type: 'POST',
		body: {
			host: host,
			termId: termId,
			subject: subject,
			value: value
		}
	}, function (err, results) {
		console.log('found ', results.length, ' classes!');


		//update the deeplink here
		if (results.length > 0) {
			treeMgr.showClasses(results, function (err, tree) {
				if (err) {
					console.log('ERROR rendering tree...?', err, tree);
					return;
				}

				treeMgr.logTree(tree, {
					type: 'search',
					host: host,
					termId: termId,
					subject: subject,
					searchQuery: value
				})
			});
		}
		else {
			this.container.innerHTML = '<div style="font-size: 28px;text-align: center;padding-top: 200px;font-weight: 600;">Nothing Found!</div>'

			treeMgr.logTree({}, {
				type: 'search',
				host: host,
				termId: termId,
				subject: subject,
				searchQuery: value

			})
		}

	}.bind(this))
};



Search.prototype.Search = Search;
module.exports = new Search();