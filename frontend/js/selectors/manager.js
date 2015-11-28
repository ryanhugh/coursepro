'use strict';

var treeMgr = require('../treeMgr')

var collegeInstance = require('./college')
var termInstance = require('./term')
var subjectInstance = require('./subject')
var classInstance = require('./class')


function Manager () {


	this.class = classInstance;
	this.subject = subjectInstance;
	this.term = termInstance;
	this.college = collegeInstance;

	//order of selectors
	this.selectors = [
	this.college,
	this.term,
	this.subject,
	this.class
	]
}



Manager.prototype.updateDeeplink = function() {
	var url = []

	this.selectors.forEach(function (dropdown) {
		if (dropdown.getValue()) {
			url.push(encodeURIComponent(dropdown.getValue()));
		};
	}.bind(this))
	
	
	var hash = url.join('/')
	
	//add both trees and selectors to history
	if (history.pushState) {
		history.pushState(null, null, "#"+hash);
	}
	else {
		window.location.hash = hash
	}

};


Manager.prototype.closeAllSelectors = function () {
	this.selectors.forEach(function(selector){
		selector.close();
	}.bind(this))
}

Manager.prototype.finish = function() {
	treeMgr.createTree(this.college.getValue(),this.term.getValue(),this.subject.getValue(),this.class.getValue())
}

//
Manager.prototype.setSelectors = function(values,doOpenNext) {
	
	//close all selectors, then open the ones told to
	this.closeAllSelectors()
	
	values.forEach(function (value,index) {

		//remove anything that isnt a letter, a "/" or a . 
		value = value.replace(/[^a-z0-9\/\.]/gi,'')


		this.selectors[index].setup({defaultValue:value,shouldOpen:false});

		//if at end, open next selector or create tree
		if (index == values.length-1) {
			
			//destroy all the selectors after this one
			this.selectors.slice(index+1).forEach(function(selector) {
				selector.reset()
				// this.resetDropdown(selector);
			}.bind(this))
			
			
			if (this.selectors[index].next) {
				this.selectors[index].next.setup({shouldOpen:doOpenNext})
			}
			else if (doOpenNext) {
				this.finish();
			}
		};

	}.bind(this))
	
	// show the homepage if nothing selected
	if (values.length==0) {
		homepage.show();
	}
};

//you can search for cs4800 if cs is open,
// but network connections would be required to search eece2222 when cs is open, so add that later
Manager.prototype.searchClasses = function(value) {

	// remove subject from beginning of search, but this only works if search for same subject that is loaded
	if (_(value.toLowerCase()).startsWith(this.subject.getValue().toLowerCase())) {
		value=value.slice(this.subject.getValue().length).trim()
	}

	for (var i = 0; i < this.class.values.length; i++) {
		var currClass = this.class.values[i];

		//yay found match, open the class
		if (currClass.id.toLowerCase()===value.toLowerCase()) {

			//open
			search.closeSearchBox();
			selectors.class.element.select2('val',value);
			selectors.class.element.trigger('select2:select')
			return true;
		};
	};
	return false;
};

Manager.prototype.updateFromHash = function() {
	var values = window.location.hash.slice(1).split('/')
	
	
	//remove empty strings
	_.pull(values,"");

	values.forEach(function (value,index) {
		values[index]= decodeURIComponent(value)
	}.bind(this))
	
	
	//if no hash, destory all dropdowns and show (but don't open) the first one
	if (values.length==0) {
		
		this.selectors.forEach(function(selector){
			selector.reset();
		}.bind(this))
		
		homepage.show();
		return;
	}



	//first term is search, last is the search term
	if (values[0]=='search') {
		this.setSelectors(values.slice(1,values.length-1),false);
		search.searchFromString(values[1],values[2],values[3],values[4])
	}
	else if (values[0] =='tests') {

		//if minified with testing
		if (window.compiledWithUnitTests) {
			var tests = require('../tests/testsMgr')
			tests.go(values.slice(1));
		}
		else {
			console.log('not running tests')
		}
	}
	else {
		
		//only activate things if hash all values
		//this prevents back button to going to when selected a non-class dropdown
		this.setSelectors(values,true);
	}
}



Manager.prototype.main = function() {
	if (window.location.hash.length>1) {
		this.updateFromHash();
	}
	
	
	
	//setup the back button history
	window.onpopstate = function(event) {
		this.updateFromHash();
	}.bind(this)

	$('.openCollegeSelector').on('click',function() {
		this.college.setup();
	}.bind(this));


}




Manager.prototype.Manager=Manager;

var instance = new Manager();

//allow circular dependencies
window.selectorsMgr = instance;

$(function () {
	instance.main();
})

