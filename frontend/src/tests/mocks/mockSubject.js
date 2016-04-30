'use strict';

var macros = require('../../macros')
var mockData = require('./mockSubjectData.json')
var MockBaseData = require('./MockBaseData')

var proxyquire = require('proxyquireify')(require);

var Subject = proxyquire('../../Subject', {
	'./BaseData': MockBaseData, 
})


function MockSubject() {
	Subject.prototype.constructor.apply(this, arguments);
}

macros.inherent(Subject, MockSubject);

MockSubject.mockData = mockData

module.exports = MockSubject;
