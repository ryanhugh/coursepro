'use strict';

var macros = require('../../macros')
var mockData = require('./mockClassData.json')
var MockBaseData = require('./MockBaseData')

var proxyquire = require('proxyquireify')(require);

var Class = proxyquire('../../Class', {
	// './BaseData': MockBaseData, 
})


function MockClass() {
	Class.prototype.constructor.apply(this, arguments);
}

macros.inherent(Class, MockClass);

MockClass.mockData = mockData

module.exports = MockClass;
 