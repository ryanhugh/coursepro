'use strict';

var macros = require('../../macros')
var mockData = require('./mockTermData.json')
var MockBaseData = require('./MockBaseData')

var proxyquire = require('proxyquireify')(require);

var Term = proxyquire('../../Term', {
	'./BaseData': MockBaseData, 
})


function MockTerm() {
	Term.prototype.constructor.apply(this, arguments);
}

macros.inherent(Term, MockTerm);

MockTerm.mockData = mockData

module.exports = MockTerm;
