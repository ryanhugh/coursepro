'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


// var request = require('../request')


function ClassList() {
	BaseDirective.prototype.constructor.apply(this, arguments);






}

ClassList.$inject = ['$scope']


ClassList.prototype.ClassList = ClassList;
module.exports = ClassList;
directiveMgr.addDirective(ClassList)