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


function XMLHttpRequest() {

	this.onreadystatechange = null;

}
XMLHttpRequest.DONE = 4;

XMLHttpRequest.prototype.open = function (method, url, isAsync) {
	if (!isAsync) {
		elog('ERROR open called with non async xml http')
	}
	if (!mockData[url] && url !== '/log') {
		elog('yo unsupported url', url)
	}

};

XMLHttpRequest.prototype.setRequestHeader = function () {

};

XMLHttpRequest.prototype.send = function (json) {
	if (this.onreadystatechange) {

		this.readyState = XMLHttpRequest.DONE
		this.status = 200;

		var body = JSON.parse(json);
		if (!body.userId) {
			elog('no userId in request?')
		}
		delete body.userId


		// MAKE THIS CODE WORK
	this.mockData.forEach(function (data) {

		//check if _id matches,
		if (!query._id || query._id !== data._id) {

			//and if it dosent check the keys
			for (var i = 0; i < keys.length; i++) {
				var keyName = keys[i]
				if (query[keyName] != data[keyName]) {
					return;
				};
			}
		};

		retVal.push(_.cloneDeep(data));


	}.bind(this))

	if (retVal.length == 0) {
		console.log("unit test error: dont have data for query",query);
		debugger
	};

	setTimeout(function () {
		callback(null, retVal);
	}.bind(this), 0)

		debugger

		//empyt for now, add more here when needed
		this.response = ''
		this.onreadystatechange()
	}
	else {
		elog("ERROR dont have a onreadystatechange!");
	}
};

window.XMLHttpRequest = XMLHttpRequest;
