'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../User')

function ClassList() {
	BaseDirective.prototype.constructor.apply(this, arguments);

	this.$scope.user = user;
}

ClassList.$inject = ['$scope']


ClassList.prototype.ClassList = ClassList;
module.exports = ClassList;
directiveMgr.addDirective(ClassList)