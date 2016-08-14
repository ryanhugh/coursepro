'use strict';
var BaseSelector = require('./baseSelector').BaseSelector;

var user = require('../data/user')
var Term = require('../data/Term')
var Keys = require('../../../common/Keys')

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

	var keys = Keys.create({
		host: selectorsMgr.college.getValue(),
	})

	Term.createMany(keys, function (err, terms) {
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