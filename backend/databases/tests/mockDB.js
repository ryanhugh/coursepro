'use strict'
var macros = require('../../macros')
var _ = require('lodash')

function MockTable(tableName) {
	this.dataIdMap = {}
	this.rows = require('./mockData/' + tableName + '.json')
	for (var i = 0; i < this.rows.length; i++) {
		this.dataIdMap[this.rows[i]._id] = this.rows[i]
	}
	this.tableName = tableName
}

// copeid from frontend request.js
MockTable.prototype.findDiff = function (src, dest) {

	var retVal = {
		srcOnly: [],
		different: [],
		same: [],
		destOnly: []
	}

	_.keys(src).concat(_.keys(dest)).forEach(function (attrName) {
		if (src[attrName] === undefined && dest[attrName] !== undefined) {
			retVal.destOnly.push(attrName)
		}
		else if (src[attrName] !== undefined && dest[attrName] === undefined) {
			retVal.srcOnly.push(attrName)
		}
		else if (_.isEqual(src[attrName], dest[attrName])) {
			retVal.same.push(attrName)
		}

		//must be different
		else {
			retVal.different.push(attrName)
		}
	}.bind(this))

	return retVal;
}


MockTable.prototype.find = function (lookup, callback) {
	if (lookup._id) {
		if (this.dataIdMap[lookup._id]) {
			return callback(null, [this.dataIdMap[lookup._id]]);
		}
		else {
			return callback(null, [])
		}
	}
	else {
		var retVal = [];
		this.rows.forEach(function (row) {
			var diff = this.findDiff(lookup, row);
			if (diff.different.length == 0 && diff.srcOnly.length == 0) {
				retVal.push(row)
			}
		}.bind(this))
		callback(null, retVal)
	}
};


// this dosen't support mongo $$$ jawns
MockTable.prototype.update = function (query, newDoc, config, callback) {
	if (_.keys(config).length != 0) {
		console.warn("UNKNown key", config)
		console.trace()
	}

	if (query._id) {
		this.dataIdMap[query._id] = newDoc;
	}

	this.find(query, function (err, docs) {
		if (docs.length > 1) {
			console.warn('ERROR where is >1 doc being updated at once')
			console.trace()
			return callback(null, docs.length)
		}

		if (docs.length === 0) {
			return callback(null, docs.length)
		}

		// var ids = [];
		// docs.forEach(function (foundDoc) {
		// 	ids.push(foundDoc._id)
		// }.bind(this))

		// only supports 1 rn

		var id = docs[0]._id;
		this.dataIdMap[id] = newDoc

		for (var i = 0; i < this.rows.length; i++) {
			if (this.rows[i]._id == id) {
				this.rows[i] = newDoc
				return callback(null, docs.length)
			}
		}
	}.bind(this))
};

MockTable.prototype.insert = function (newDoc, callback) {
	if (newDoc._id) {
		console.warn('ERROR newdoc has a _id??')
		console.trace()
	}

	var newDoc = _.cloneDeep(newDoc);

	newDoc._id = Math.random() + ''
	this.dataIdMap[newDoc._id] = newDoc;
	this.rows.push(newDoc)
};



function MockDB() {

}

MockDB.prototype.get = function (tableName) {
	return new MockTable(tableName);
};
MockDB.prototype.close = function () {

};

module.exports = new MockDB()
