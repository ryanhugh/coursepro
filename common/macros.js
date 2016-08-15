'use strict';


function Macros() {


	// Two user variables used to keep track of the last selected college and term. 
	this.LAST_SELECTED_COLLEGE = 'lastSelectedCollege';
	this.LAST_SELECTED_TERM = 'lastSelectedTerm';


	// Three lists in use for user.
	this.SAVED_LIST = 'saved';
	this.WATCHING_LIST = 'watching';
	this.SELECTED_LIST = 'selected';


	//endpoints

	this.LIST_COLLEGES = '/listColleges'
	this.LIST_TERMS = '/listTerms'
	this.LIST_SUBJECTS = '/listSubjects'
	this.LIST_CLASSES = '/listClasses'
	this.LIST_SECTIONS = '/listSections'

	this.GET_SEARCH_INDEX = '/getSearchIndex'

	// this.


	// 30 min
	// interval for a updater.js
	// This single constant is used in frontend description in the html and in backend setInterval
	this.DB_REFRESH_INTERVAL = 1800000
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
