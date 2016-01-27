'use strict';
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


function SearchDropdown($timeout, $document) {

	function SearchDropdownInner() {

	}


	SearchDropdownInner.scope = true;

	SearchDropdownInner.prototype.link = function (scope, element, attrs) {

		var targetElement = $(attrs.searchDropdown)

		//close
		$document.on('click', function () {
			targetElement.parent().removeClass('open');
			scope.$apply()
		}.bind(this))


		//open
		element.on('click', function (event) {

			this.updateTermSubject(scope)
			targetElement.dropdown('toggle'); //toggle only opens it and does not close it...


			//focus the jawn
			var textBox = element[0].getElementsByClassName('form-control')[0];
			textBox.focus()


			event.stopPropagation()
			scope.$apply()
		}.bind(this))
		this.updateTermSubject(scope)


	}

	SearchDropdownInner.prototype.updateTermSubject = function (scope) {

		scope.termText = selectorsMgr.term.getText();
		return;
		scope.subjectText = selectorsMgr.subject.getText();

	};


	var instance = new SearchDropdownInner();
	instance.link = instance.link.bind(instance)

	return instance;
}


SearchDropdown.$inject = ['$timeout', '$document'];


SearchDropdown.prototype.SearchDropdown = SearchDropdown;
module.exports = SearchDropdown;
directiveMgr.addLink(SearchDropdown)