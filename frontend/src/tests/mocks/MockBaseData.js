'use strict';

var macros = require('../../macros')
var BaseData = require('../../BaseData')


//Now, the main data classes inherent from the normal data class and this class second,
// which sets up everything correcly
// another way to do it would be to have them proxirequire basedata when including their original class,
// and point it towards mock base data --doing it this way now, the other way override prototype.download on the second inheretance, and makeing a mock without 
// inhereting from the real thing didnt work


function MockBaseData() {
	BaseData.prototype.constructor.apply(this, arguments);
}

macros.inherent(BaseData, MockBaseData);

MockBaseData.download = function (config, callback) {
	if (!callback) {
		callback = function () {}
	};

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
		console.log("unit test error: dont have data for query");
		debugger
	};

	return callback(null, retVal);
};


module.exports = MockBaseData;
