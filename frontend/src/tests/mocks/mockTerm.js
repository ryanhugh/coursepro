'use strict';

var Term = require('../../Term')
var macros = require('../../macros')
var mockData = require('./mockTermData.json')
var MockBaseData = require('./MockBaseData')


function MockTerm() {
	Term.prototype.constructor.apply(this, arguments);
}

macros.inherent(Term, MockTerm);
macros.inherent(MockBaseData, MockTerm);

MockTerm.mockData = mockData


module.exports = MockTerm;
