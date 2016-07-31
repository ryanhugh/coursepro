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
		else if (injectName == '$scope') {
			arguments[i].self = this;
			arguments[i][directiveMgr.calculateName(this.constructor)] = this;
			arguments[i].macros = macros;
		}
		// else

		this[injectName] = arguments[i]
	};
	
	this.constructor.instance = this;
}



module.exports = BaseDirective;