'use strict';

function BaseDirective ($scope) {
	this.$scope = $scope;
	$scope.self = this;
}



module.exports = BaseDirective;