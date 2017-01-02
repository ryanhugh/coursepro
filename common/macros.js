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


function Macros() {


	// Two user variables used to keep track of the last selected college and term. 
	this.LAST_SELECTED_COLLEGE = 'lastSelectedCollege';
	this.LAST_SELECTED_TERM = 'lastSelectedTerm';
	this.EXPANDED_PANEL_ONCE = 'expandedPanelOnce'


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

	this.GET_CURRENT_COLLEGE = '/getCurrentCollege'

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
