'use strict';
var assert = require('assert')

var macros = require('../macros')
var Class = require('../Class')


function ClassTests() {

}


ClassTests.prototype.go = function () {


	assert.equal(null, Class.create({
		host: 'neu.edu',
		termId: '201630',
		subject: 'CS'
	}))


	Class.create({
		host: 'sju.edu',
		termId: '201610',
		subject: 'JPN',
		classId: '201'
	}).download(function (err, aClass) {

		assert.equal(aClass.dataStatus,macros.DATASTATUS_DONE)

		assert.equal("5683ef8c36b66840e8690940", aClass._id)
		assert.equal(aClass.prereqs.values[0].isClass, true)
		assert.equal(aClass.prereqs.values[0].isString, true)
		assert.equal(aClass.prereqs.values[0].desc, "Language Placement JP201")
	}.bind(this))



	Class.create({
		_id: '5683f72136b66840e86abe0d'
	}).download(function (err, aClass) {
		// console.log(err, aClass)

		assert.equal("1302", aClass.classId)
		assert.equal("neu.edu", aClass.host)
		assert.equal("201540", aClass.termId)
		assert.equal('or', aClass.prereqs.type)
		assert.equal(0, aClass.prereqs.values.length)
		assert.equal('or', aClass.coreqs.type)
		assert.equal(0, aClass.coreqs.values.length)

	}.bind(this))

	Class.create({
		host: 'neu.edu',
		termId: '201630',
		subject: 'CS',
		classId: '2800'
	}).download(function (err, aClass) {

		assert.equal(aClass.dataStatus,macros.DATASTATUS_DONE)

		assert.equal("5683f7f636b66840e86b2045", aClass._id)
		assert.equal("neu.edu", aClass.host)
		assert.equal("201630", aClass.termId)

		assert.equal(1, aClass.coreqs.values.length)
		assert.equal('2801', aClass.coreqs.values[0].classId)

		assert.equal('and', aClass.prereqs.type)
		assert.equal(2, aClass.prereqs.values.length)

		// console.log(err, aClass)
	}.bind(this))


	Class.create({
		host: 'neu.edu',
		termId: '201630',
		subject: 'CS',
		classId: '2510'
	}).download(function (err, aClass) {

		assert.equal(aClass.dataStatus,macros.DATASTATUS_DONE)

		assert.equal(undefined, aClass._id)
		assert.equal("neu.edu", aClass.host)
		assert.equal("201630", aClass.termId)

		assert.equal(0, aClass.coreqs.values.length)
		
		assert.equal('or', aClass.prereqs.type)
		assert.equal(3, aClass.prereqs.values.length)

		// console.log(err, aClass)
	}.bind(this))



};



ClassTests.prototype.ClassTests = ClassTests
module.exports = new ClassTests()