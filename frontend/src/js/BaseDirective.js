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

	this.constructor.instance = this;

	if (this.$scope) {
		this.$scope.self = this;
		this.$scope[directiveMgr.calculateName(this.constructor)] = this;
		this.$scope.macros = macros;

		this.$scope.$on('$destroy', function () {
			alert('removing instance')
			this.constructor.instance = null;
		}.bind(this))


	}
}



module.exports = BaseDirective;
