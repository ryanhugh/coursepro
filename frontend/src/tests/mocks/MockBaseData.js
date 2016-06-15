'use strict';

var macros = require('../../macros')
var BaseData = require('../../BaseData')

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

	var query = _.merge(config.body, config.resultsQuery)
	var keys = this.requiredPath.slice(0)//.concat(this.optionalPath);

	// only check them if the query has them
	this.optionalPath.forEach(function (key) {
		if (query[key]) {
			keys.push(key)
		}
	}.bind(this))

	var retVal = [];


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
};


module.exports = MockBaseData;
