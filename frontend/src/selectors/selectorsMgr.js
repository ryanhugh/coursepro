'use strict';
var _ = require('lodash')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')

var College = require('./College')
var Term = require('./Term')
var Subject = require('./Subject')
var Class = require('./Class')


function SelectorsMgr() {
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

	this.$scope.$on('$routeChangeSuccess', function () {

		var params = this.$routeParams;
		if (_.isEqual(params, {})) {

			//if no route and no value in college, 
			if (!this.college.getValue()) {

				//if user has values, use those

				var lastSelectedCollege = user.getValue('lastSelectedCollege')

				//what if user has not loaded yet????
				if (lastSelectedCollege) {
					// show to dropdown, but not opened
					this.college.setup({
						shouldOpen: false,
						defaultValue: lastSelectedCollege
					})


					//load term too?
					var lastSelectedTerm = user.getValue('lastSelectedTerm')

					// show to dropdown, but not opened
					if (lastSelectedTerm) {
						this.term.setup({
							shouldOpen: false,
							defaultValue: lastSelectedTerm
						})

						this.subject.setup({
							shouldOpen: false,
							defaultValue: this.subject.helpId
						})
					}
					else {
						this.term.setup({
							shouldOpen: false,
							defaultValue: this.term.helpId
						})
					}



				}
				else {
					// show to dropdown, but not opened
					this.college.setup({
						shouldOpen: false,
						defaultValue: this.college.helpId
					})
				}
			};
			return;
		};

		var values = [params.host, params.termId, params.subject, params.classId]

		values.forEach(function (value, i) {
			values[i] = decodeURIComponent(value)
		}.bind(this))

		selectorsMgr.setSelectors(values, true);
	}.bind(this));
}
SelectorsMgr.$inject = ['$scope', '$routeParams', '$route', '$location']


//prototype constructor
SelectorsMgr.prototype = Object.create(BaseDirective.prototype);
SelectorsMgr.prototype.constructor = SelectorsMgr;


SelectorsMgr.prototype.closeAllSelectors = function () {
	this.selectors.forEach(function (selector) {
		selector.close();
	}.bind(this))
}

SelectorsMgr.prototype.finish = function (callback) {
	var host = encodeURIComponent(this.college.getValue())
	var termId = encodeURIComponent(this.term.getValue())
	var subject = encodeURIComponent(this.subject.getValue())
	var classId = encodeURIComponent(this.class.getValue())

	this.$location.path('/graph/' + host + '/' + termId + '/' + subject + '/' + classId)

	setTimeout(function () {
		this.$scope.$apply()
	}.bind(this), 0)
}

SelectorsMgr.prototype.setSelectors = function (values, doOpenNext) {

	//close all selectors, then open the ones told to
	this.closeAllSelectors()

	values.forEach(function (value, index) {
		if (!value) {
			return;
		};

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
			// else if (doOpenNext) {
			//  this.finish(function (err) {
			//      if (err) {
			//          console.log('error creating tree from selectors', err)
			//      }
			//  });
			// }
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
