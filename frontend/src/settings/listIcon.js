'use strict';
var _ = require('lodash')

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../user')


function ListIcon() {

	function ListIconInner() {

		//which tooltips to show for which state on which list
		this.listNameToTooltip = {
			watching: {
				true: 'Click to unsubscribe from email notifications',
				false: 'Click to subscribe to email notifications'
			},
			saved: {
				false: 'Click to save for later',
				true: 'Click to unsave'
			}
		}

		this.glyphicons = {
			watching: 'glyphicon-envelope',
			saved: 'glyphicon-star'
		}



		this.scope = true
		this.templateUrl = '/html/listIcon.html'

	}
	ListIconInner.prototype.getInList = function ($scope) {
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



	ListIconInner.prototype.getTooltip = function ($scope) {
		var isInList = this.getInList($scope)

		return this.listNameToTooltip[$scope.listName][isInList]
	};


	ListIconInner.prototype.getStyle = function ($scope) {

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

	ListIconInner.prototype.link = function ($scope, element, attrs) {

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
				user.toggleListContainsClass(listName, $scope.class, attrs.toggleSections ,function (err) {
					$scope.$root.$apply()
				}.bind(this))
			}

			event.stopPropagation()
			$scope.$root.$apply()
		}.bind(this))

	}


	var instance = new ListIconInner();
	instance.link = instance.link.bind(instance)

	return instance;
}



ListIcon.prototype.ListIcon = ListIcon;
module.exports = ListIcon;
directiveMgr.addLink(ListIcon)