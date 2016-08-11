'use strict';
var _ = require('lodash')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../data/user')


function ListIcon() {

	//which tooltips to show for which state on which list
	this.listNameToTooltip = {
		watching: {
			true: 'Click to unsubscribe from email notifications',
			false: 'Click to subscribe to email notifications'
		},
		saved: {
			false: 'Click to save to calendar',
			true: 'Click to unsave'
		}
	}

	this.glyphicons = {
		watching: 'glyphicon-envelope',
		saved: 'glyphicon-star'
	}

	this.templateUrl = 'listIcon.html'
}

ListIcon.$inject = []
ListIcon.fnName = 'ListIcon'

ListIcon.prototype.getInList = function ($scope) {
	if ($scope.toggle == 'class') {
		return user.getListIncludesClass($scope.listName, $scope.class)

	}
	else if ($scope.toggle == 'section') {
		return user.getListIncludesSection($scope.listName, $scope.section)
	}
	else {
		elog('ERROR $scope.toggle is not a jawn', $scope.toggle)
		return null;
	}
};



ListIcon.prototype.getTooltip = function ($scope) {
	var isInList = this.getInList($scope)

	return this.listNameToTooltip[$scope.listName][isInList]
};


ListIcon.prototype.getStyle = function ($scope) {

	var isInList = this.getInList($scope)

	if (isInList) {
		return {
			cursor: 'pointer'
		};
	}
	else {
		return {
			cursor: 'pointer',
			color: '#bbb'
		}
	}
};

ListIcon.prototype.link = function ($scope, element, attrs) {

	var listName = attrs.listIcon

	if (!listName || !this.listNameToTooltip[listName] || !this.glyphicons[listName]) {
		elog('no list icon ???', attrs)
	}

	$scope.glyphiconType = this.glyphicons[listName]
	$scope.toggle = attrs.toggle


	$scope.listIcon = this;
	$scope.listName = listName

	//open
	element.on('click', function (event) {


		if ($scope.toggle == 'section') {
			user.toggleListContainsSection(listName, $scope.section, function (err) {
				$scope.$root.$apply()
			}.bind(this))
		}
		else if ($scope.toggle == 'class') {
			user.toggleListContainsClass(listName, $scope.class, attrs.toggleSections, function (err) {
				$scope.$root.$apply()
			}.bind(this))
		}

		event.stopPropagation()
		$scope.$root.$apply()
		return false;
	}.bind(this))

}


ListIcon.prototype.ListIcon = ListIcon;
module.exports = ListIcon;
directiveMgr.addDirective(ListIcon)
