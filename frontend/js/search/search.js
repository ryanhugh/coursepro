'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


var request = require('../request')


function Search($scope) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	$scope.search = this;

	this.searchText = ''

	this.isExpanded = false;
}

 
Search.prototype.searchFromString = function (host, termId, subject, string) {
	if (!string) {
		return
	};
	this.searchText = string;
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

	if (!this.searchText) {
		console.log('error: empty box')
		return;
	};

	this.go(host, termId, subject, this.searchText);
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
module.exports = Search;
directiveMgr.addDirective(Search)