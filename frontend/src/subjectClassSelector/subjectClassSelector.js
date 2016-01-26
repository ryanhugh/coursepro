'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var Term = require('../Term')
var user = require('../user')


function SubjectClassSelector() {
    BaseDirective.prototype.constructor.apply(this, arguments);

    this.updateSubjects()

}

SubjectClassSelector.prototype.updateSubjects = function () {
    if (this.$scope.subjects) {
        return;
    };

    var term = Term.create({
        host: user.getValue('lastSelectedCollege'),
        termId: user.getValue('lastSelectedTerm')
    })
    // debugger

    term.loadSubjects(function (err) {
        if (err) {
            elog("err", err);
            return;
        }

        console.log("done,", term.subjects);

        var subjects = [];
        term.subjects.forEach(function (subject) {
            subjects.push({
                text:subject.text,
                value:subject.subject
            })
        }.bind(this))

        // console.log(JSON.stringify(subjects));

        this.$scope.subjects = subjects
        setTimeout(function () {
            this.$scope.$apply()
        }.bind(this),0)



    }.bind(this))
};


SubjectClassSelector.prototype.getHost = function () {
    return selectorsMgr.college.getValue()
}
SubjectClassSelector.prototype.getTermId = function () {
    return selectorsMgr.termId.getValue()
};

SubjectClassSelector.$inject = ['$scope']
SubjectClassSelector.$scope = {}

SubjectClassSelector.prototype.SubjectClassSelector = SubjectClassSelector;
module.exports = SubjectClassSelector;
directiveMgr.addDirective(SubjectClassSelector)
