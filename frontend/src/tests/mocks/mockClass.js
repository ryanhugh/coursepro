'use strict';

var Class = require('../../Class')
var macros = require('../../macros')
var mockData = require('./mockClassData.json')
var MockBaseData = require('./MockBaseData')


function MockClass() {
	Class.prototype.constructor.apply(this, arguments);
}

macros.inherent(Class, MockClass);
macros.inherent(MockBaseData, MockClass);

MockClass.mockData = mockData

module.exports = MockClass;
