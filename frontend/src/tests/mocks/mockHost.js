'use strict';

var macros = require('../../macros')
var mockData = require('./mockHostData.json')
var MockBaseData = require('./MockBaseData')

var proxyquire = require('proxyquireify')(require);

var Host = proxyquire('../../Host', {
	'./BaseData': MockBaseData, 
})


function MockHost() {
	Host.prototype.constructor.apply(this, arguments);
}

macros.inherent(Host, MockHost);

MockHost.mockData = mockData

module.exports = MockHost;
