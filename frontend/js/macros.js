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

	// In unit tests, window.elog is defined in main.tests.js to be just console.error
	if (!macros.UNIT_TESTS) {
		//used all over the place for logging erros
		window.elog = function () {

			var args = [];
			for (var i = 0; i < arguments.length; i++) {
				args[i] = arguments[i];
			}

			console.log.apply(console, ['ELOG'].concat(args));
			debugger
			console.trace();

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
		}.bind(this)
	}
}

commonMacros.inherent(commonMacros.Macros, Macros)



Macros.prototype.Macros = Macros;
module.exports = new Macros();
