/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

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
