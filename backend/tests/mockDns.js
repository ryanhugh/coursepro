'use strict';


function MockDns() {

}


MockDns.prototype.reverse = function (ip, callback) {
	if (ip.startsWith('129.10') || ip.startsWith('155.33')) {
		return callback(null, ['bla.bla.bla.neu.edu'])
	}
	else {
		elog('dont have data unit tests will fail!!!')
		return callback('nooooooooo')
	}
};


module.exports = new MockDns();
