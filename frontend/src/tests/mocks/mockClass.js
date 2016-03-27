'use strict';

var Class = require('../../Class')
var macros = require('../../macros')
var staticData = require('./mockClassData.json')


function MockClass() {
	Class.prototype.constructor.apply(this, arguments);



}

macros.inherent(Class, MockClass);

MockClass.download = function (config, callback) {

	//make sure have all the keys
	if (!config.body._id) {

		this.requiredPath.forEach(function (key) {
			if (!config.body[key]) {
				elog(this.name, ' not given a ', key, ' in mock class!!');
				return;
			}
		}.bind(this))
	}

	var keys = this.requiredPath.concat(this.optionalPath);

	var retVal = [];

	var query = _.merge(config.body, config.resultsQuery)

	staticData.forEach(function (data) {

		for (var i = 0; i < keys.length; i++) {
			var keyName = keys[i]
			if (query[keyName] != data[keyName]) {
				return;
			};
		}

		retVal.push(_.cloneDeep(data));


	}.bind(this))

	if (retVal.length == 0) {
		console.log("unit test error: dont have data for query");
		debugger
	};

	return callback(null, retVal);





};


module.exports = MockClass;
