'use strict';

var request = require('./request')
var angular = require('angular')
var angularDirectives = angular.module('app', []); //move this to abstraction layer

function Settings($scope) {

	this.$scope = $scope

	this.settingsElement = document.getElementById('settingsId');
	this.masterContainer = document.getElementById('masterContainerId');
}

Settings.prototype.populateFields = function (userData) {

};

Settings.prototype.isVisible = function () {

	// if the element has a parent, it is in the container, if not it needs to be added
	if (this.settingsElement.parentElement) {
		return true
	}
	else {
		return false;
	}
}



Settings.prototype.show = function () {

	request({
		url: '/getUser',
		type: 'POST',
		auth: true
	}, function (err, user) {
		if (err) {
			console.log('ERROR', err)
			return;
		}

		this.populateFields(user)
	}.bind(this))

	if (this.isVisible()) {
		return;
	}

	// document.body.style.height = '';
	// document.body.style.width = '';


	this.masterContainer.appendChild(this.settingsElement);

}

Settings.prototype.hide = function () {
	$(this.settingsElement).detach()
};



Settings.prototype.Settings = Settings;
// module.exports = new Settings();

angularDirectives.directive('settings', function () {
	return {
		templateUrl: 'settings.html',
		scope: true,
		controller: Settings
	};
}.bind(this))


// this.templateUrl = 'test.html'
