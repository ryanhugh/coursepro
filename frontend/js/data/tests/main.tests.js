'use strict';
var _ = require('lodash')

var mockClassData = require('./mocks/mockClassData.json')
var mockSubjectData = require('./mocks/mockSubjectData.json')
var mockHostData = require('./mocks/mockHostData.json')
var mockTermData = require('./mocks/mockTermData.json')
var mockSectionData = require('./mocks/mockSectionData.json')
var mockSearchIndex = require('./mocks/mockSearchIndex.json')
var Keys = require('../../../../common/Keys')

localStorage.clear()

var mockData = {
	'listColleges': mockHostData,
	'listTerms': mockTermData,
	'listSubjects': mockSubjectData,
	'listClasses': mockClassData,
	'listSections': mockSectionData,
	'getSearchIndex': mockSearchIndex
}

window.elog = console.error.bind(console);
window.ga = function () {}

//First attempt at mocking out the frontend classes:
//I tried having the mock classes inherent from their respective class and mockBaseData, but there were conflicts with static methods 
//with the second inherent overriding the first instead of the first calling the second.

//Second:
// Now, the mock data classes inherent from their respective real class, which inherents from mock base data, which inherents from base data. 
// eg, mockClass -> Class -> MockBaseData -> BaseData. 

//Then, needed to add support for /log, so just reassigned window.XMLHttpRequest and made it work with /listClasses, etc too
// and removed all the mock classes and proxyquire



function XMLHttpRequest() {

	this.onreadystatechange = null;

	// set in .open()
	this.url = null;
	this.method = null;

}
XMLHttpRequest.DONE = 4;

XMLHttpRequest.prototype.open = function (method, url, isAsync) {
	if (!isAsync) {
		elog('ERROR open called with non async xml http')
	}
	if (method != 'GET' && method != 'POST') {
		elog('unknown method', method)
	}
	this.method = method;
	this.url = url;

};

XMLHttpRequest.prototype.setRequestHeader = function () {

};

XMLHttpRequest.prototype.send = function (json) {
	if (this.onreadystatechange) {

		this.readyState = XMLHttpRequest.DONE
		this.status = 200;

		if (this.url === '/log') {
			this.response = '{"status":"success"}'
		}
		else {

			if (_(this.url).includes('_')) {
				elog('underscores not supported in tests yet!')
			}

			var urlSplit = this.url.split('/');
			var endpoint = urlSplit[1];
			var body;
			if (this.method === 'POST') {
				body = JSON.parse(json);
				if (!body.userId) {
					elog('no userId in request?')
				}
			}


			var thisMockData = mockData[endpoint]

			if (!thisMockData) {
				elog('unit test error: dont have url for request', endpoint)
			}


			var retVal;
			if (endpoint === 'getSearchIndex') {
				retVal = thisMockData
			}
			else {
				retVal = [];
				thisMockData.forEach(function (data) {
					var match = false;
					if (body) {
						match = Keys.create(body).propsEqual(data);
					}
					else {
						match = Keys.create({
							host: data.host,
							termId: data.termId
						}).getHashWithEndpoint('/' + endpoint) === this.url
					}

					if (match) {

						// dont need to clone because json stringify'ing below
						retVal.push(data);
					}

				}.bind(this))

				if (retVal.length == 0) {
					elog("unit test error: dont have data for query", endpoint, this.url);
				};
			}
			this.response = JSON.stringify(retVal)
		}


		setTimeout(function () {
			this.onreadystatechange()
		}.bind(this), 0)
	}
	else {
		elog("ERROR dont have a onreadystatechange!");
	}
};

window.XMLHttpRequest = XMLHttpRequest;
