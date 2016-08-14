'use strict';


function Macros() {


	// Two user variables used to keep track of the last selected college and term. 
	this.LAST_SELECTED_COLLEGE = 'lastSelectedCollege';
	this.LAST_SELECTED_TERM = 'lastSelectedTerm';

	// Three lists in use for user.
	this.SAVED_LIST = 'saved';
	this.WATCHING_LIST = 'watching';
	this.SELECTED_LIST = 'selected';

	this.inherent = this.inherent.bind(this)
	this.inherent.toString = function () {
		console.error(new Error().stack)
	}.bind(this)


}



Macros.prototype.inherent = function (Baseclass, Subclass) {

	//hi
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


// console.log(module.exports.inherent.toString());