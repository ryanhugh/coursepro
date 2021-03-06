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
var _ = require('lodash')
var commonMacros = require('../../common/macros')
var request = require('./request')
window.jQuery = window.$ = require('jquery')

//used just to define constance used mostly in treeMgr, also in render.js
function Macros() {
	commonMacros.Macros.prototype.constructor.apply(this, arguments);


	//states of classes
	this.DATASTATUS_NOTSTARTED = 0;
	this.DATASTATUS_LOADING = 1;
	this.DATASTATUS_DONE = 2;
	this.DATASTATUS_FAIL = 3;

	// These is also hardcoded into the css
	this.SEARCH_WIDTH = 300;
	this.NAVBAR_HEIGHT = 50;

	// This is the default for nodes, and is what is allways used for collision
	// When a panel expands to the prompt and to a expanded panel, node.width changes. 
	this.NODE_WIDTH = 174;
	this.NODE_HEIGHT = 50;
	this.NODE_EXPANDED_MAX_WIDTH = 780;
	this.NODE_EXPANDED_MIN_WIDTH = 576;

	this.SELECT_PANEL_WIDTH = 300;

	this.FIREFOX = _(navigator.userAgent.toLowerCase()).includes('firefox')


	window.elogWithoutStack = function () {

		var args = [];
		for (var i = 0; i < arguments.length; i++) {
			args[i] = arguments[i];
		}

		console.log.apply(console, ['ELOG'].concat(args));
		console.trace();
		debugger

		var bodyString;

		var outputString = []

		args.forEach(function (arg) {

			var str;
			try {
				str = JSON.stringify(arg)
			}
			catch (e) {
				str = 'circular data'
			}
			outputString.push(str)
		}.bind(this))

		bodyString = {
			msg: outputString.join(''),
			url: location.hash
		}

		//use a separate calls stack in case this throws an error, it will not affect code that calls this
		setTimeout(function () {
			request({
				url: '/logError',
				useCache: false,
				body: bodyString
			}, function (err, response) {
				if (err) {
					console.log("error logging error... lol");
				};
			}.bind(this))
		}.bind(this), 0)
	}
	
	// In unit tests, window.elog is defined in main.tests.js to be just console.error
	if (!macros.UNIT_TESTS) {




		//used all over the place for logging erros
		window.elog = function () {

			var args = [];
			for (var i = 0; i < arguments.length; i++) {
				args[i] = arguments[i];
			}

			args.push(new Error().stack)

			window.elogWithoutStack.apply(window, args)
		}.bind(this)
	}
}

commonMacros.inherent(commonMacros.Macros, Macros)



Macros.prototype.Macros = Macros;
module.exports = new Macros();
