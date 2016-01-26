'use strict';

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

function SubjectClassSelector() {
    BaseDirective.prototype.constructor.apply(this, arguments);



}


SubjectClassSelector.$inject = ['$scope']


SubjectClassSelector.prototype.SubjectClassSelector = SubjectClassSelector;
module.exports = SubjectClassSelector;
directiveMgr.addDirective(SubjectClassSelector)
