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

var macros = require('./macros')

var directiveMgr = require('./directiveMgr')

function BaseDirective() {
	var injectNames = this.constructor.$inject;
	if (!injectNames) {
		elog("ERROR not given $inject!?");
		return;
	}

	//need to access arguments, cant use forEach
	for (var i = 0; i < injectNames.length; i++) {
		var injectName = injectNames[i];

		if (injectName == '$location') {
			//wrapper here
		}

		this[injectName] = arguments[i]
	};

	if (this.constructor.instance && this.$scope) {
		console.error('already have instance of ', this, '?')
	}

	this.constructor.instance = this;

	if (this.$scope) {
		this.$scope.self = this;
		this.$scope[directiveMgr.calculateName(this.constructor)] = this;
		this.$scope.macros = macros;

		// Angular controllers are re created each time they are used, so remove the old instance from this.constructor
		// Add set the new one. Directives are only instantiated once and also don't have a $scope, so this will not run if this is a directive. 
		this.$scope.$on('$destroy', function () {
			this.constructor.instance = null;
		}.bind(this))
	}

	if (this.link) {
		this.link = this.link.bind(this)
	}
}


// Use the angular timeout so it is automatically cancelled if the directive is deallocated.
// But don't run the $digest loop so can run that manually in code
BaseDirective.prototype.timeout = function (fn, ms) {
	if (!this.$timeout) {
		elog('no timeout on ' + this.constructor.name)
	}

	// default ms to 0
	if (ms === undefined) {
		ms = 0;
	}

	this.$timeout(fn, ms, false);
};


module.exports = BaseDirective;
