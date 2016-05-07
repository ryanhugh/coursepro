'use strict';

function MockPageData() {
	this.data = {};
}

MockPageData.prototype.setData = function (name, value) {
	this.data[name] = value;
};

module.exports = MockPageData