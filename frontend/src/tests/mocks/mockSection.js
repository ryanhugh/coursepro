'use strict';

var macros = require('../../macros')
var mockData = require('./mockSectionData.json')
var MockBaseData = require('./MockBaseData')

var proxyquire = require('proxyquireify')(require);

var Section = proxyquire('../../Section', {
	'./BaseData': MockBaseData, 
})


function MockSection() {
	Section.prototype.constructor.apply(this, arguments);
}

macros.inherent(Section, MockSection);

MockSection.mockData = mockData

module.exports = MockSection;
