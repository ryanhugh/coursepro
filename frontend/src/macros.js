'use strict';

var request = require('./request')

//used just to define constance used mostly in treeMgr, also in render.js
function Macros() {


	//states of trees
	this.DATASTATUS_NOTSTARTED = 0;
	this.DATASTATUS_LOADING = 1;
	this.DATASTATUS_DONE = 2;
	this.DATASTATUS_FAIL = 3;

	//used all over the place for logging erros
	window.elog = function () {

		//use a separate calls stack in case this throws an error, it will not affect code that calls this
		setTimeout(function () {
			var args = [];
			for (var i = 0; i < arguments.length; i++) {
				args[i] = arguments[i];
			}

			console.log.apply(console, args);
			console.trace();

			request({
				url: '/logError',
				useCache: false,
				body: args
			}, function (err, response) {
				if (err) {
					console.log("error logging error... lol");
				};
			}.bind(this))
		}.bind(this), 0)
	}.bind(this)
}


Macros.prototype.Macros = Macros;
module.exports = new Macros();