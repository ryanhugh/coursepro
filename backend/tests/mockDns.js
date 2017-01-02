/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

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
