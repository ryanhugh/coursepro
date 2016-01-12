'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var graph = require('../graph')

var College = require('./College')
var Term = require('./Term')
var Subject = require('./Subject')
var Class = require('./Class')


function SelectorsMgr($scope, $routeParams) {
	BaseDirective.prototype.constructor.apply(this, arguments);

	//allow circular dependencies
	window.selectorsMgr = this;

	//these must be made in this order, because they keep references to the next one (except class)
	this.class = new Class();
	this.subject = new Subject();
	this.term = new Term();
	this.college = new College();

	//order of selectors
	this.selectors = [
		this.college,
		this.term,
		this.subject,
		this.class
	]

	// selectorsMgr.setSelectors(values, true);
}

//prototype constructor
SelectorsMgr.prototype = Object.create(BaseDirective.prototype);
SelectorsMgr.prototype.constructor = SelectorsMgr;


SelectorsMgr.prototype.updateDeeplink = function () {
	var url = []

	this.selectors.forEach(function (dropdown) {
		if (dropdown.getValue()) {
			url.push(encodeURIComponent(dropdown.getValue()));
		};
	}.bind(this))


	var hash = url.join('/')

	//add both trees and selectors to history
	if (history.pushState) {
		history.pushState(null, null, "#" + hash);
	}
	else {
		window.location.hash = hash
	}

};


SelectorsMgr.prototype.closeAllSelectors = function () {
	this.selectors.forEach(function (selector) {
		selector.close();
	}.bind(this))
}

SelectorsMgr.prototype.finish = function (callback) {
	graph.createGraph({
		host: this.college.getValue(),
		termId: this.term.getValue(),
		subject: this.subject.getValue(),
		classId: this.class.getValue(),
		callback
	});
}

SelectorsMgr.prototype.setSelectors = function (values, doOpenNext) {

	//close all selectors, then open the ones told to
	this.closeAllSelectors()

	values.forEach(function (value, index) {

		//remove anything that isnt a letter, a "/" or a . 
		value = value.replace(/[^a-z0-9\/\.]/gi, '')


		this.selectors[index].setup({
			defaultValue: value,
			shouldOpen: false
		});

		//if at end, open next selector or create tree
		if (index == values.length - 1) {

			//destroy all the selectors after this one
			this.selectors.slice(index + 1).forEach(function (selector) {
				selector.reset()
					// this.resetDropdown(selector);
			}.bind(this))


			if (this.selectors[index].next) {
				this.selectors[index].next.setup({
					shouldOpen: doOpenNext,
					defaultValue: this.selectors[index].helpId
				})
			}
			else if (doOpenNext) {
				this.finish(function (err) {
					if (err) {
						console.log('error creating tree from selectors', err)
					}
				});
			}
		};

	}.bind(this))

};

//you can search for cs4800 if cs is open,
// but network connections would be required to search eece2222 when cs is open, so add that later
SelectorsMgr.prototype.searchClasses = function (value) {

	// remove subject from beginning of search, but this only works if search for same subject that is loaded
	if (_(value.toLowerCase()).startsWith(this.subject.getValue().toLowerCase())) {
		value = value.slice(this.subject.getValue().length).trim()
	}

	for (var i = 0; i < this.class.values.length; i++) {
		var currClass = this.class.values[i];

		//yay found match, open the class
		if (currClass.id.toLowerCase() === value.toLowerCase()) {

			//open
			this.class.element.select2('val', value);
			this.class.element.trigger('select2:select')
			return true;
		};
	};
	return false;
};

SelectorsMgr.prototype.resetAllSelectors = function () {

	this.selectors.forEach(function (selector) {
		selector.reset();
	}.bind(this))

};

SelectorsMgr.prototype.go = function () {
	this.college.setup()
};


//window.selectorsMgr is set in the constructor
SelectorsMgr.prototype.SelectorsMgr = SelectorsMgr;
module.exports = SelectorsMgr;
directiveMgr.addDirective(SelectorsMgr)