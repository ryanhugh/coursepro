'use strict';
var search = require('./search')
var render = require('./render')
var homepage = require('./homepage')
var settings = require('./settings')

function Main() {



	//setup the back button history
	window.onpopstate = function(event) {
		this.updateFromHash();
	}.bind(this)


	$(".showHomepage").on('click', function () {
		this.clickHomeButton();
	}.bind(this))
}


Main.prototype.clickHomeButton = function () {

	if (homepage.isOnHomepage()) {
		return;
	};


	history.pushState(null, null, "#"); // only do this if icon clicked, not if back used to show

	settings.hide();
	graph.hide();
	homepage.show();
};



Main.prototype.updateFromHash = function () {
	var values = window.location.hash.slice(1).split('/')


	//remove empty strings
	_.pull(values, "");

	values.forEach(function (value, index) {
		values[index] = decodeURIComponent(value)
	}.bind(this))


	//if no hash, destroy all dropdowns and show (but don't open) the first one
	if (values.length == 0) {
		selectorsMgr.resetAllSelectors()
		render.clearContainer()
		settings.hide()
		homepage.show();
		return;
	}



	//first term is search, last is the search term
	if (values[0] == 'search') {
		selectorsMgr.setSelectors(values.slice(1, values.length - 1), false);	
		search.searchFromString(values[1], values[2], values[3], values[4])
	}
	else if (values[0] == 'tests') {

		//if minified with testing
		if (window.compiledWithUnitTests) {
			window.unitTestsMgr.go(values.slice(1));
		}
		else {
			console.log('not running tests')
		}
	}
	else if (values[0] == 'settings') {
		homepage.removeHomepage();
		render.clearContainer()
		// settings.show()
		document.getElementById('settingsId')
	}
	else {


		//only activate things if hash all values
		//this prevents back button to going to when selected a non-class dropdown
		selectorsMgr.setSelectors(values, true);
	}
}

// http://stackoverflow.com/questions/19999388/check-if-user-is-using-ie-with-jquery
Main.prototype.checkForIE = function () {
	var ua = navigator.userAgent;
	if (_(ua).includes("MSIE ") || ua.match(/Trident.*rv\:11\./)) {
		alert("This site doesn't work so great in Internet Explorer/Edge. Try upgrading to Google Chrome or Firefox!")
	}
};


Main.prototype.main = function () {

	this.checkForIE()

	if (window.location.hash.length > 1) {
		this.updateFromHash();
	}
};

Main.prototype.Main = Main;
// var instance = new Main();

$(function () {
	// instance.main();
})

// module.exports = instance;