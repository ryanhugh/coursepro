'use strict';

var macros = require('../../macros')
var BaseData = require('../../BaseData')

// Now, the mock data classes inherent from their respective real class, which inherents from mock base data, which inherents from base data. 
// eg, mockClass -> Class -> MockBaseData -> BaseData. 

//Before this I tried having the mock classes inherent from their respective class and mockBaseData, but there were conflicts with static methods 
//with the second inherent overriding the first instead of the first calling the second.


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

	setTimeout(function () {
		callback(null, retVal);
	}.bind(this), 0)
};


module.exports = MockBaseData;
