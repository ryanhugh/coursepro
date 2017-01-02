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
var macros = require('../macros')
var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')

var user = require('../data/user')

function NavBar() {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.$scope.user = user;
}

NavBar.fnName = 'NavBar'
NavBar.$inject = ['$scope','$uibModal']

NavBar.prototype.getHost = function() {
	return user.getValue(macros.LAST_SELECTED_COLLEGE)
}
NavBar.prototype.getTerm = function() {
	return user.getValue(macros.LAST_SELECTED_TERM);
};

NavBar.prototype.openSelectors = function() {
	selectorsMgr.go()
};


NavBar.prototype.NavBar = NavBar;
module.exports = NavBar;
directiveMgr.addController(NavBar)