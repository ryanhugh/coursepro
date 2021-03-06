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
var queue = require('d3-queue').queue;
var async = require('async')
var moment = require('moment')

var macros = require('../macros')
var memoize = require('../../../common/memoize')
var request = require('../request')
var Class = require('./Class')
var Section = require('./Section')
var Term = require('./Term')
var Host = require('./Host')
var Section = require('./Section')
var Keys = require('../../../common/Keys')

function User() {

	//all the data on the db schema for users is copied to this object
	//and updated on some events
	// perhaps change vv to dataChangeTrigger + type? no, because there is only 1 state, authenticated+with data, or neither. 
	this.onAuthFinishTriggers = []

	this.onDataStabilizeTriggers = [];

	//data in the server
	//email and name are copied to this when done loading
	//sections and classes watching, when loaded, are copied to this.watching
	this.dbData = {
		lists: {},
		vars: {},

		// Keep track of changes to the version so future types can upgrade/clear localStorage
		version: this.constructor.DBDATA_VERSION
			// loginKey:'' // generated when login with google
	}

	//lastSelectedCollege and lastSelectedTerm are used now

	//here, actual instances of classes and sections are stored
	// 2 key inveriants:
	//   1. if a section in a list, the class is in the same list
	//   2. if a class is not a list, none of that classes sections are either
	this.lists = {
		// watching: {
		// 	classes: [],
		// 	sections: [],
		// 	dataStatus: macros.DATASTATUS_NOTSTARTED
		// },
		// saved: {
		// 	classes: [],
		// 	sections: []
		// }
	}

	//this is incremented for each request, and decreased for every completed request
	this.activeRequestCount = 0;

	//timestamp of last networking request
	this.lastRequestTime = 0;

	// the status of downloading the data from the server. If don't have login key, this stays at not started. 
	this.dataStatus = macros.DATASTATUS_NOTSTARTED

	// Whether onDataStabilize has been called or not. 
	this.hasStabilized = false;

	this.loadFromLocalStorage();

}

User.DBDATA_VERSION = 2;

User.prototype.loadFromLocalStorage = function () {
	// load data
	// everything comes from localstorage.dbData if don't have login key, else everything except loginKey comes from server.
	// three cases:
	// 1. have login key -> download data
	// 2. have localstorage -> load this.dbData = localData
	// 3. have nothing -> this.dbData = ... (above)

	if (localStorage.dbData) {
		var localData = JSON.parse(localStorage.dbData);

		if (localData.loginKey) {

			// cool, user logged in with google before, download the rest of the data from the server
			// this.dbData.loginKey = localData.loginKey
			// this.dbData.vars = localData.vars
			this.dbData = localData;
			this.download(_.noop)
		}
		// Must be v1, where class _id's were stored and version was not kept track of
		else if (localData && !localData.version) {

			// There were 2 things in dbData at this version: vars and lists
			this.dbData.vars = localData.vars;

			//TODO: copy the old _ids to the new format


			this.onDataStabilize()
		}

		// valid local data
		else if (localData.version == this.constructor.DBDATA_VERSION) {
			this.dbData = localData;
			this.onDataStabilize()
		}
	}
	else {
		this.onDataStabilize()
	}
};


User.prototype.saveData = function () {
	//save all dbData to localStorage
	localStorage.dbData = JSON.stringify(this.dbData)
};



//just returns weather have a login key or not
User.prototype.getAuthenticated = function () {
	if (this.dbData.loginKey) {
		return true;
	}
	else {
		return false;
	}
};

// same as below but only fires when finished logging in with google
User.prototype.onAuthenticate = function (name, callback) {

	if (this.dataStatus === macros.DATASTATUS_DONE) {
		return callback();
	}
	else {
		this.onAuthFinishTriggers.push({
			name: name,
			trigger: callback
		})
	}
};


// fires when dbData is stabalized
// if don't have loginKey, fires now
// else fires when done downloading from server
// will only fire once
User.prototype.onAuthFinish = function (name, callback) {

	//lol just fire it now
	// if don't have loginKey or already done loading
	if (this.hasStabilized === true) {
		return callback();
	}
	else {

		this.onDataStabilizeTriggers.push({
			name: name,
			trigger: callback
		})
	}
};

// Called when the data on this is stabilized. 
// Guestimates the host and termId and then fires the triggers
User.prototype.onDataStabilize = function (callback) {
	if (!callback) {
		callback = function () {}
	}
	this.saveData()

	if (this.hasStabilized) {
		elog()
	}

	var allValidHosts = [];
	var allValidTerms = [];


	async.waterfall([function (callback) {

			var q = queue();

			q.defer(function (callback) {
				Host.createMany(Keys.create({}), function (err, hosts) {
					if (err) {
						return callback(err)
					}
					allValidHosts = hosts;
					callback()
				}.bind(this))
			}.bind(this))

			q.defer(function (callback) {

				var lastSelectedCollege = this.getValue(macros.LAST_SELECTED_COLLEGE);

				if (!lastSelectedCollege) {
					return callback()
				}
				else {
					Term.createMany(Keys.create({
						host: lastSelectedCollege
					}), function (err, terms) {
						if (err) {
							return callback(err)
						}
						allValidTerms = terms;
						callback()
					}.bind(this))
				}
			}.bind(this))

			q.awaitAll(function (err) {
				if (err) {
					return callback(err)
				}

				var lastSelectedCollege = this.getValue(macros.LAST_SELECTED_COLLEGE);

				var foundHost = false;
				for (var i = 0; i < allValidHosts.length; i++) {
					if (lastSelectedCollege == allValidHosts[i].host) {
						foundHost = true;
						break;
					}
				}

				if (!foundHost) {
					this.setValue(macros.LAST_SELECTED_COLLEGE, null)
					this.setValue(macros.LAST_SELECTED_TERM, null)
					return callback()
				}
				else {
					var lastSelectedTerm = this.getValue(macros.LAST_SELECTED_TERM);
					var foundTerm = false;

					for (var i = 0; i < allValidTerms.length; i++) {
						if (lastSelectedTerm == allValidTerms[i].termId) {
							foundTerm = true;
							break;
						}
					}

					if (!foundTerm) {
						this.setValue(macros.LAST_SELECTED_TERM, null)
					}

					callback()
				}
			}.bind(this))

		}.bind(this),
		function (callback) {

			if (this.getValue(macros.LAST_SELECTED_COLLEGE)) {
				return callback()
			}
			else {
				this.guessHost(function (err) {
					if (err) {
						elog(err)
					}
					return callback()
				}.bind(this))
			}
		}.bind(this),
		function (callback) {
			if (this.getValue(macros.LAST_SELECTED_TERM)) {
				return callback()
			}
			else {
				this.guessTerm(function (err) {
					if (err) {
						elog(err)
					}
					return callback()
				}.bind(this))
			}

		}.bind(this),
		function (callback) {
			var host = this.getValue(macros.LAST_SELECTED_COLLEGE);
			var termId = this.getValue(macros.LAST_SELECTED_TERM);
			if (!host || !termId) {
				return callback()
			}

			var keys = Keys.create({
				host: host,
				termId: termId
			})

			//Prefetch the term and host data for this term

			var q = queue();

			q.defer(function (callback) {

				// Get all the data in this term
				var requestQuery = {
					url: macros.LIST_CLASSES,
					keys: keys
				}

				Class.downloadResultsGroup(requestQuery, function (err) {
					return callback(err)
				}.bind(this))
			}.bind(this))

			q.defer(function (callback) {

				// Get all the data in this term
				var requestQuery = {
					url: macros.LIST_SECTIONS,
					keys: keys
				}

				Section.downloadResultsGroup(requestQuery, function (err) {
					return callback(err)
				}.bind(this))
			}.bind(this))

			q.awaitAll(function (err) {
				callback(err)
			}.bind(this))

		}.bind(this)
	], function (err) {
		if (err) {
			elog(err);
		}

		if (this.hasStabilized) {
			elog()
		}
		this.hasStabilized = true;


		//and fire off the triggers
		this.onDataStabilizeTriggers.forEach(function (trigger) {
			trigger.trigger();
		}.bind(this))

		//remove all triggers on success
		this.onDataStabilizeTriggers = []

		callback()
	}.bind(this))
};


User.prototype.guessHost = function (callback) {
	if (!callback) {
		callback = function () {}
	}
	request({
		url: macros.GET_CURRENT_COLLEGE,
		method: "POST"
	}, function (err, body) {
		if (err) {
			elog(err);

			// Don't propagate the error because it doesn't matter if this failed. 
			return callback()
		}

		if (!body || !body.host) {
			return callback()
		}

		// Make sure the host exists and is valid
		var host = Host.create({
			host: body.host
		})

		host.download(function (err, host) {
			if (err) {
				elog(err)
				return callback(err)
			}

			if (host.dataStatus === macros.DATASTATUS_DONE) {
				this.setValue(macros.LAST_SELECTED_COLLEGE, body.host)
			}
			return callback()

		}.bind(this))
	}.bind(this))
};

User.prototype.guessTerm = function (callback) {
	if (!callback) {
		callback = function () {}
	}
	var host = this.getValue(macros.LAST_SELECTED_COLLEGE)
	if (!host) {
		return callback()
	}

	Term.createMany(Keys.create({
		host: host
	}), function (err, terms) {

		var newTerms = []

		terms.forEach(function (term) {

			var startDate = moment((parseInt(term.startDate) + 1) * 24 * 60 * 60 * 1000);
			var endDate = moment((parseInt(term.endDate) + 1) * 24 * 60 * 60 * 1000);

			// If the endDate of the semester is in less than 45 days, skip
			if (endDate.clone().subtract(45, 'days').diff(moment(new Date())) < 0) {
				return;
			} 

			//Less than 80 days in this term, remove summer classes and other short terms
			if (endDate.diff(startDate, 'days') < 80) {
				return;
			}
			newTerms.push(term)
		}.bind(this))

		newTerms.sort(function (a, b) {
			var aStart = parseInt(a.startDate)
			var bStart = parseInt(b.startDate);
			if (aStart < bStart) {
				return -1
			}
			else if (aStart > bStart) {
				return 1;
			}
			else {
				return 0;
			}
		}.bind(this))

		if (newTerms.length > 0) {
			this.setValue(macros.LAST_SELECTED_TERM, newTerms[0].termId, function (err) {
				return callback(null, newTerms[0].termId)
			}.bind(this))
		}
		else {
			if (terms.length > 0) {
				elog('terms.length > 0 but no newterms')
			}

			return callback()
		}
	}.bind(this))
};






User.prototype.removeTriggers = function (name) {
	var triggersToRemove = _.filter(this.onAuthFinishTriggers, {
		name: name
	})

	triggersToRemove.forEach(function (trigger) {
		_.pull(this.onAuthFinishTriggers, trigger)
	}.bind(this))
};


//this is called direcly from the signed in with google.js
User.prototype.signedInWithGoogle = function (err, idToken) {
	if (err) {
		console.log("ERROR", err);

		//keep the callbacks when error
		return;
	};

	this.download({
		body: {
			idToken: idToken
		}
	})
}



//networking stuff


//all user networking requests go through here
User.prototype.sendRequest = function (config, callback) {
	if (!callback) {
		callback = function () {}
	};

	if (!config.url) {
		elog('error config does not have a url', config);
		return callback('internal error')
	};

	config.method = 'POST'
	config.useCache = false;

	if (!config.body) {
		config.body = {}
	}
	config.body.loginKey = this.dbData.loginKey;


	this.activeRequestCount++;

	this.lastRequestTime = new Date().getTime()

	request(config, function (err, response) {

		this.activeRequestCount--;


		if (err) {
			elog('ERROR', err)
			return callback(err);
		}

		//if its a msg, return the error msg or the success msg
		if (config.isMsg) {
			if (response.error) {
				return callback(response.msg)
			}
			else {
				return callback(null, response.msg)
			}
		}

		//return the contents
		else {
			return callback(null, response)
		}

	}.bind(this))
};

User.prototype.download = function (callbackOrConfig, callback) {
	var config = {};

	if (typeof callbackOrConfig == 'function') {
		config = {}
		callback = callbackOrConfig
	}
	else if (typeof callbackOrConfig == 'object') {
		config = callbackOrConfig
	}

	if (!callback) {
		callback = function () {}
	};


	this.internalDownload(config, callback)
};


//download user data
User.prototype.internalDownload = memoize(function (config, callback) {
	if (this.dataStatus === macros.DATASTATUS_DONE) {
		return callback(null, this)
	};

	if (this.dataStatus === macros.DATASTATUS_LOADING) {
		elog("user download called while loading!!!");
	};


	if (!this.getAuthenticated() && (!config.body || !config.body.idToken)) {
		console.log("ERROR not authenticated cant get user data");
		return callback('Cannot get user data without being signed in')
	};

	config.url = '/getUser'

	this.dataStatus = macros.DATASTATUS_LOADING
	this.sendRequest(config, function (err, user) {
		if (err) {
			this.dataStatus = macros.DATASTATUS_FAIL;
			console.log('ERROR', err)
			return callback(err)
		}
		this.dataStatus = macros.DATASTATUS_DONE;

		var q = queue();

		this.dbData.loginKey = user.loginKey;
		this.dbData.email = user.email;
		
		
		// When enabling this again, need to think about how possibly different data is going to be merged on every page load
		// Right now, when this instance first loads, the data is loaded from localstorage even if have login key.
		// ALso need to send download request when have loginKey, to verify loginkey
		if (0) {

			if (!user.loginKey) {
				console.log("didn't get a login key?", user, err)
				return callback('error')
			}


			// Keep a reference to the local lists, and add them after the serverLists have been downloaded
			var localLists = this.lists;
			var localVars = this.dbData.vars;

			//copy the attrs to this.dbData
			for (var attrName in user) {
				this.dbData[attrName] = user[attrName]
			}

			// reset lists, because we just changed this.dbData.lists and we need to reload any lists
			this.lists = {}


			// Merge the lists and don't call download callback until server has localLists. 
			for (var listName in localLists) {
				q.defer(function (callback) {
					this.addToList(listName, localLists[listName].classes, localLists[listName].sections, callback);
				}.bind(this));
			}

			//Merge the vars
			for (var varName in localVars) {
				if (this.dbData.vars[varName] && this.dbData.vars[varName] != localVars[varName]) {
					elog('remove var ' + varName + 'already exists and is set to ' + this.dbData.vars[varName], 'not overrideing to ', localVars[varName])
				}
				else {
					q.defer(function (callback) {
						this.setValue(varName, localVars[varName], function (err) {
							callback(err)
						}.bind(this))
					}.bind(this))
				}
			}

		}

		q.awaitAll(function (err) {

			//and fire off the triggers
			this.onAuthFinishTriggers.forEach(function (trigger) {
				trigger.trigger();
			}.bind(this))

			//remove all triggers on success
			this.onAuthFinishTriggers = []

			if (!this.hasStabilized) {
				this.onDataStabilize(function (err) {
					return callback(err, this)
				}.bind(this))
			}


		}.bind(this))
	}.bind(this))
});


// http://stackoverflow.com/a/46181/11236
// this is also done server side
User.prototype.validateEmail = function (email) {
	if (!email) {
		return false;
	};

	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	if (!re.test(email)) {
		console.log('email failed regex', email)
		return false;
	}

	return true;
}


//watch classes


User.prototype.subscribeForNews = function (email, callback) {

	if (!this.validateEmail(email)) {
		console.log(email, 'is not an email address!');

		//show some warning in the html
		return callback('Invalid email, try again');
	}

	console.log('email submitted:', email);

	this.sendRequest({
		url: '/registerForEmails',
		isMsg: true,
		body: {
			email: email
		}
	}, callback);
};


User.prototype.loadList = memoize(function (listName, callback) {
	if (!callback) {
		callback = function () {}
	};

	// wait data downloaded from server to run this
	this.onAuthFinish(this.constructor.name, function () {
		// if the list already exists, do some checks to make sure its in a valid state
		if (this.lists[listName]) {

			if (this.lists[listName].dataStatus === macros.DATASTATUS_DONE) {
				return callback(null, this.lists[listName])
			};

			if (this.lists[listName].classes.length != 0 || this.lists[listName].sections.length != 0) {
				console.log("ERROR user load list called on list ", listName, 'that was not empty');
				return callback(null, this.lists[listName])
			};


			if (this.lists[listName].dataStatus !== macros.DATASTATUS_NOTSTARTED && this.lists[listName].dataStatus !== undefined) {
				elog('loadWatching called when data status was', this.lists[listName].dataStatus)
				return callback('internal error');
			};
		};

		var q = queue()

		this.ensureList(listName)

		this.lists[listName].dataStatus = macros.DATASTATUS_LOADING

		//fetch all the class data from the keys in the user watch list
		this.dbData.lists[listName].classes.forEach(function (classKeys) {
			q.defer(function (callback) {
				var aClass = Class.create(classKeys);
				if (aClass.isString) {

					this.lists[listName].classes.push(aClass);
					return callback()
				}
				else {
					aClass.download(function (err, aClass) {
						if (err) {
							return callback(err)
						}

						this.lists[listName].classes.push(aClass);
						callback()
					}.bind(this))
				}
			}.bind(this))
		}.bind(this))


		//same thing for the sections
		this.dbData.lists[listName].sections.forEach(function (sectionKeys) {
			q.defer(function (callback) {
				Section.create(sectionKeys).download(function (err, section) {
					if (err) {
						return callback(err)
					}
					this.lists[listName].sections.push(section)
					callback()
				}.bind(this))
			}.bind(this))
		}.bind(this))

		q.awaitAll(function (err) {
			if (err) {
				this.lists[listName].dataStatus = macros.DATASTATUS_FAIL;
				elog(err, 'when loading ', listName, ' classes+sections')
				return callback(err)
			}
			this.lists[listName].dataStatus = macros.DATASTATUS_DONE;
			callback(null, this.lists[listName])
		}.bind(this))
	}.bind(this))
}, function (listName) {
	return listName
}.bind(this));

User.prototype.loadAllLists = function (callback) {

	var q = queue()

	for (var listName in this.dbData.lists) {
		q.defer(function (callback) {
			this.loadList(listName, function (err) {
				callback(err)
			}.bind(this))
		}.bind(this))
	}

	q.awaitAll(function (err) {
		callback(err)
	}.bind(this))
};



//call load all before this 
User.prototype.getAllClassesInLists = function () {
	var classes = [];
	for (var listName in this.lists) {
		this.lists[listName].classes.forEach(function (aClass) {

			// Only add if not already in there
			for (var i = 0; i < this.lists[listName].classes.length; i++) {
				this.lists[listName].classes[i].equals(aClass)
				return;
			}
			classes.push(aClass)
		}.bind(this))
	}

	return classes;
};

User.prototype.ensureList = function (listName) {
	if (!this.lists[listName]) {
		this.lists[listName] = {
			classes: [],
			sections: [],
			dataStatus: macros.DATASTATUS_NOTSTARTED
		}
	};
	if (!this.dbData.lists[listName]) {
		this.dbData.lists[listName] = {
			classes: [],
			sections: []
		}
	};
};


//base add and remove calls
User.prototype.addToList = function (listName, classes, sections, callback) {
	if (!callback) {
		callback = function () {}
	}
	
	this.ensureList(listName);

	if (classes.length == 0 && sections.length == 0) {
		console.log("addto lists called with no classes or section");
		return callback()
	};
	
	
	var initClassCount = this.lists[listName].classes.length
	var initSectionCount = this.lists[listName].sections.length

	var sectionObjs = [];
	var classesObjs = [];


	// Add them to the dbData before the call to loadLists, so they are added synchronously 
	sections.forEach(function (section) {
		var addToDBSections = true;
		var keys = Keys.create(section, macros.LIST_SECTIONS)
		for (var i = 0; i < this.dbData.lists[listName].sections.length; i++) {
			if (keys.propsEqual(this.dbData.lists[listName].sections[i])) {
				addToDBSections = false;
				break;
			}
		}

		if (addToDBSections) {
			sectionObjs.push(keys.getObj())
			this.dbData.lists[listName].sections.push(keys.getObj())
		}
	}.bind(this))


	classes.forEach(function (aClass) {
		var addToDBClasses = true;
		var keys;
		if (aClass.isString) {
			keys = Keys.createWithString(aClass)
		}
		else {
			keys = Keys.create(aClass)
		}
		for (var i = 0; i < this.dbData.lists[listName].classes.length; i++) {
			if (keys.propsEqual(this.dbData.lists[listName].classes[i])) {
				addToDBClasses = false;
				break;
			}
		}

		if (addToDBClasses) {
			this.dbData.lists[listName].classes.push(keys.getObj())
			classesObjs.push(keys.getObj())
		}
	}.bind(this))



	this.loadList(listName, function (err) {
		if (err) {
			return callback(err)
		}
		
		
		//add the section, but make sure to not add duplicate section
		//it could be a different instance of that same section
		sections.forEach(function (section) {
			var addToSections = true;
			var keys = Keys.create(section, macros.LIST_SECTIONS)
			for (var i = 0; i < this.lists[listName].sections.length; i++) {
				if (keys.propsEqual(this.lists[listName].sections[i])) {
					addToSections = false;
					break;
				}
			}
	
			if (addToSections) {
				// Unless loaded lists earlier ...
				console.log("Probably shouldn't add to list here because did it above and then loaded lists?");
				this.lists[listName].sections.push(section);
			}
		}.bind(this))
	
		// Add the new class to this.lists and this.lists
		classes.forEach(function (aClass) {
			var addToClasses = true;
			
			var keys;
			if (aClass.isString) {
				keys = Keys.createWithString(aClass)
			}
			else {
				keys = Keys.create(aClass)
			}
			
			for (var i = 0; i < this.lists[listName].classes.length; i++) {
				if (keys.propsEqual(this.lists[listName].classes[i])) {
					addToClasses = false;
					break;
				}
			}
	
			if (addToClasses) {
				console.log("Probably shouldn't add to list here because did it above and then loaded lists?");
				this.lists[listName].classes.push(aClass);
				
			}
		}.bind(this))




		if (this.dbData.lists[listName].sections.length != this.lists[listName].sections.length) {
			elog()
		}

		if (this.dbData.lists[listName].classes.length != this.lists[listName].classes.length) {
			elog()
		}


		ga('send', {
			'hitType': 'pageview',
			'page': '/addToList/' + listName + '/',
			'title': 'Coursepro.io'
		});

		var finalClassCount = this.dbData.lists[listName].classes.length;
		var finalSectionCount = this.dbData.lists[listName].sections.length;

		request({
			url: '/log',
			body: {
				type: 'addToList',
				initClassCount: initClassCount,
				initSectionCount: initSectionCount,
				finalClassCount: finalClassCount,
				finalSectionCount: finalSectionCount
			},
			useCache: false
		}, function (err, response) {
			if (err) {
				elog("ERROR: couldn't log addToList :(", err, response);
			}
		}.bind(this))

		if (initClassCount == finalClassCount && initSectionCount == finalSectionCount) {
			console.log("warning only added classes that already existed, still telling server");
		};

		this.saveData()
		if (this.getAuthenticated()) {
			this.sendRequest({
				url: '/addToUserLists',
				isMsg: true,
				body: {
					listName: listName,
					classes: classesObjs,
					sections: sectionObjs
				}
			}, callback)
		}
		else {
			return callback()
		}
	}.bind(this));
};

User.prototype.removeFromList = function (listName, classes, sections, callback) {
	if (!callback) {
		callback = function () {}
	}

	this.ensureList(listName)

	var initClassCount = this.lists[listName].classes.length
	var initSectionCount = this.lists[listName].sections.length

	var classObjs = []
	var sectionObjs = []

	classes.forEach(function (aClass) {

		var classKey;
		if (aClass.isString) {
			classKey = Keys.createWithString(aClass).getObj();
		}
		else {
			classKey = Keys.create(aClass).getObj();
			classObjs.push(classKey)
		}

		//remove it from this.lists
		var matchingClasses = _.filter(this.lists[listName].classes, classKey);

		_.pullAll(this.lists[listName].classes, matchingClasses)


		//and this.dbData.lists
		var matchingClassKeys = _.filter(this.dbData.lists[listName].classes, classKey);
		_.pullAll(this.dbData.lists[listName].classes, matchingClassKeys)
	}.bind(this))

	sections.forEach(function (section) {
		var sectionKey = Keys.create(section).getObj();

		sectionObjs.push(sectionKey)

		//remove it from this.lists
		var matchingSections = _.filter(this.lists[listName].sections, sectionKey);

		_.pullAll(this.lists[listName].sections, matchingSections)


		//and this.dbData.lists
		var matchingSectionKeys = _.filter(this.dbData.lists[listName].sections, sectionKey);
		_.pullAll(this.dbData.lists[listName].sections, matchingSectionKeys)
	}.bind(this))

	ga('send', {
		'hitType': 'pageview',
		'page': '/removeFromList/' + listName + '/',
		'title': 'Coursepro.io'
	});


	request({
		url: '/log',
		body: {
			type: 'removeFromList',
			initClassCount: initClassCount,
			initSectionCount: initSectionCount,
			finalClassCount: this.lists[listName].classes.length,
			finalSectionCount: this.lists[listName].sections.length
		},
		useCache: false
	}, function (err, response) {
		if (err) {
			elog("ERROR: couldn't log removeFromList :(", err, response);
		}
	}.bind(this))

	this.saveData()
	if (this.getAuthenticated()) {
		this.sendRequest({
			url: '/removeFromUserLists',
			isMsg: true,
			body: {
				listName: listName,
				classes: classObjs,
				sections: sectionObjs
			}
		}, callback)
	}
	else {
		return callback()
	}
};


// Check the dbData instead of this.lists so the list dosen't have to be loaded
User.prototype.getListIncludesClass = function (listName, aClass) {
	this.ensureList(listName)
	for (var i = 0; i < this.dbData.lists[listName].classes.length; i++) {
		var currKeys = this.dbData.lists[listName].classes[i];

		var isMatch = true;

		for (var attrName in currKeys) {
			if (currKeys[attrName] !== aClass[attrName]) {
				isMatch = false;
			}
		}
		if (isMatch) {
			return true;
		}
	}
	return false;
};


User.prototype.getListIncludesSection = function (listName, section) {
	this.ensureList(listName)
	for (var i = 0; i < this.dbData.lists[listName].sections.length; i++) {
		var currKeys = this.dbData.lists[listName].sections[i];

		var isMatch = true;

		for (var attrName in currKeys) {
			if (currKeys[attrName] !== section[attrName]) {
				isMatch = false;
			}
		}
		if (isMatch) {
			return true;
		}
	}
	return false;
};

User.prototype.getList = function (listName) {
	this.ensureList(listName)

	return this.lists[listName]
};


User.prototype.toggleListContainsSection = function (listName, section, callback) {
	if (!callback) {
		callback = function () {}
	}


	//if watching, unwatch it
	if (this.getListIncludesSection(listName, section)) {

		this.removeFromList(listName, [], [section], function (err) {
			callback(err)
		}.bind(this))

	}
	//add it to the watch list
	//and tell server
	else {

		var classInstance = Class.create({
			host: section.host,
			termId: section.termId,
			subject: section.subject,
			classUid: section.classUid
		});
		if (classInstance.dataStatus === macros.DATASTATUS_NOTSTARTED) {
			console.warn('had to load class in toggleListContainsSection :(')
		}
		classInstance.download(function (err) {
			if (err) {
				return callback(err)
			}
			this.addToList(listName, [classInstance], [section], function (err) {
				callback(err)
			}.bind(this))
		}.bind(this))
	}
};

User.prototype.toggleListContainsClass = function (listName, aClass, addSections, callback) {
	if (!callback) {
		callback = function () {}
	}

	var q = queue();

	if (!aClass.isString) {
		q.defer(function (callback) {
			aClass.loadSections(function (err) {
				callback(err)
			}.bind(this))
		}.bind(this))
	}

	q.awaitAll(function (err) {
		if (err) {
			return callback(err)
		}

		//if watching, unwatch it
		if (this.getListIncludesClass(listName, aClass)) {

			//removing a class also removes all of its sections
			this.removeFromList(listName, [aClass], aClass.sections, function (err) {
				callback(err)
			}.bind(this))

		}
		//add it to the watch list
		//and tell server
		else {
			var sectionsToAdd = [];
			if (addSections) {
				sectionsToAdd = aClass.sections
			};


			this.addToList(listName, [aClass], sectionsToAdd, function (err) {
				callback(err)
			}.bind(this))
		}

	}.bind(this))

};

User.prototype.getValue = function (name) {
	if (!name) {
		elog('no name in get value?')
	}
	return this.dbData.vars[name];
};

// lastSelectedCollege
// lastSelectedTerm
// are used now
User.prototype.setValue = function (name, value, callback) {
	if (!callback) {
		callback = function () {}
	};


	this.dbData.vars[name] = value;
	this.saveData()
	if (this.getAuthenticated()) {

		//and tell the server
		this.sendRequest({
			url: '/setUserVar',
			isMsg: true,
			body: {
				name: name,
				value: value
			}
		}, callback);

	}
	else {
		return callback()
	}

};

User.prototype.User = User;
module.exports = new User();
