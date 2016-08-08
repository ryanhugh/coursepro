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

	if (this.constructor.instance) {
		console.error('already have instance of ',this,'?')
	}

	this.constructor.instance = this;

	if (this.$scope) {
		this.$scope.self = this;
		this.$scope[directiveMgr.calculateName(this.constructor)] = this;
		this.$scope.macros = macros;

		// Angular controllers are re created each time they are used, so remove the old instance from this.constructor
		// Add set the new one. Directives are only instantiated once and also don't have a $scope, so this will not run if this is a directive. 
		this.$scope.$on('$destroy', function () {
			console.log("Deallocating" + this.constructor.name);
			this.constructor.instance = null;
		}.bind(this))
	}
}



module.exports = BaseDirective;
