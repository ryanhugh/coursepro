'use strict';
var request = require('./request')
window.jQuery = window.$ = require('jquery')

//used just to define constance used mostly in treeMgr, also in render.js
function Macros() {


	//states of trees
	this.DATASTATUS_NOTSTARTED = 0;
	this.DATASTATUS_LOADING = 1;
	this.DATASTATUS_DONE = 2;
	this.DATASTATUS_FAIL = 3;

	if (window.elog) {
		return;
	}
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
			msg:outputString.join('')
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

Macros.prototype.inherent = function (Baseclass, Subclass) {

	//copy static methods
	for (var attrName in Baseclass) {
		Subclass[attrName] = Baseclass[attrName]
	}

	//prototype constructor
	Subclass.prototype = Object.create(Baseclass.prototype);
	Subclass.prototype.constructor = Subclass;
};


Macros.prototype.Macros = Macros;
module.exports = new Macros();