'use strict';
var moment = require('moment')

var macros = require('../macros')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


function SelectHelpModel() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.model = this;

	this.doneRendering = true;
}

SelectHelpModel.fnName = 'SelectHelpModel'
SelectHelpModel.$inject = ['$scope', '$uibModalInstance', '$timeout']

//called from controllers wanting to open this
SelectHelpModel.open = function (caller) {
	if (!caller.$uibModal) {
		elog('tried to open a SelectHelpModel but caller does not have a $uibModal')
	}

	caller.$uibModal.open({
		animation: true,
		templateUrl: directiveMgr.getHTMLPathFromClass(SelectHelpModel),
		controller: SelectHelpModel
	})
};




SelectHelpModel.prototype.close = function () {
	this.$uibModalInstance.close()
};


SelectHelpModel.prototype.SelectHelpModel = SelectHelpModel;
module.exports = SelectHelpModel;
directiveMgr.addRawController(SelectHelpModel)
