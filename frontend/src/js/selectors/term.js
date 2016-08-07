'use strict';
var BaseSelector = require('./baseSelector').BaseSelector;

var user = require('../user')
var Term = require('../Term')

function TermSelector() {
	BaseSelector.prototype.constructor.apply(this, arguments);
	this.element = $(".selectTerm");
	this.class = 'termSelectContainer';
	this.helpText = 'Select Term'
}


//prototype constructor
TermSelector.prototype = Object.create(BaseSelector.prototype);
TermSelector.prototype.constructor = TermSelector;

TermSelector.prototype.onSelect = function (value) {
	user.setValue(macros.LAST_SELECTED_TERM, value)
};


TermSelector.prototype.download = function (callback) {
	if (!callback) {
		callback = function () {}
	}

	Term.createMany({
		host: selectorsMgr.college.getValue(),
	}, function (err, terms) {
		if (err) {
			elog(err)
			return callback(err)
		}

		var retVal = [];
		terms.forEach(function (term) {
			retVal.push({
				text: term.text,
				id: term.termId
			})
		}.bind(this))

		return callback(err, retVal)
	}.bind(this))
};

module.exports = TermSelector;
