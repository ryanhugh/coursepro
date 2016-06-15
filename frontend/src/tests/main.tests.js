localStorage.clear()
var mockClassData = require('./mocks/mockClassData.json')
var mockSubjectData = require('./mocks/mockSubjectData.json')
var mockHostData = require('./mocks/mockHostData.json')
var mockTermData = require('./mocks/mockTermData.json')
var mockSectionData = require('./mocks/mockSectionData.json')

var mockData = {
	'/listColleges': mockHostData,
	'/listTerms': mockTermData,
	'/listSubjects': mockSubjectData,
	'/listClasses': mockClassData,
	'/listSections': mockSectionData
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
	this.url = null;

}
XMLHttpRequest.DONE = 4;

XMLHttpRequest.prototype.open = function (method, url, isAsync) {
	if (!isAsync) {
		elog('ERROR open called with non async xml http')
	}
	if (!mockData[url] && url !== '/log') {
		elog('yo unsupported url', url)
	}
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
			var body = JSON.parse(json);
			if (!body.userId) {
				elog('no userId in request?')
			}
			delete body.userId

			var thisMockData = mockData[this.url]

			if (!thisMockData) {
				debugger
			}


			var retVal = [];
			// MAKE THIS CODE WORK
			thisMockData.forEach(function (data) {

				for (var attrName in body) {
					if (body[attrName] != data[attrName]) {
						return;
					}
				}
				// dont need to clone because json stringify'ing below
				retVal.push(data);

			}.bind(this))

			if (retVal.length == 0) {
				elog("unit test error: dont have data for query", body);
				debugger
			};
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
