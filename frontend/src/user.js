'use strict';
var _ = require('lodash')
var queue = require('d3-queue').queue;
var macros = require('./macros')

var request = require('./request')
var Class = require('./Class')
var Section = require('./Section')

function User() {

	//all the data on the db schema for users is copied to this object
	//and updated on some events
	// perhaps change vv to dataChangeTrigger + type? no, because there is only 1 state, authenticated+with data, or neither. 

	this.onAuthFinishTriggers = []

	//data in the server
	//email and name are copied to this when done loading
	//sections and classes watching, when loaded, are copied to this.watching
	this.dbData = {
		lists: {},
		vars: {},
		// loginKey:'' // generated when login with google
	}

	//lastSelectedCollege and lastSelectedTerm are used now

	//here, actual instances of classes and sections are stored
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
			this.dbData.loginKey = localData.loginKey
			this.dbData.vars = localData.vars
			this.download()
		}

		// valid local data
		else {
			this.dbData = localData;
		}
	}
	window.user = this

}


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
	if (!this.getAuthenticated() || this.dataStatus === macros.DATASTATUS_DONE) {
		return callback();
	}
	else {

		this.onAuthFinishTriggers.push({
			name: name,
			trigger: callback
		})

	}

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

	config.type = 'POST'
	config.useCache = false;

	if (config.tree) {
		config.body = config.tree.getIdentifer().full.obj;
	}
	if (!config.body) {
		config.body = {}
	}
	config.body.loginKey = this.dbData.loginKey;


	this.activeRequestCount++;

	this.lastRequestTime = new Date().getTime()
		// console.log("resettting time!",this.lastRequestTime);

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


//download user data
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

		if (!user.loginKey) {
			console.log("didn't get a login key?", user, err)
			return callback('error')
		}

		// this.dbData.loginKey = user.loginKey;
		// this.dbData.email = user.email;

		// Keep a reference to the local lists, and add them after the serverLists have been downloaded
		var localLists = this.lists;
		var localVars = this.dbData.vars;

		//copy the attrs to this.dbData
		for (var attrName in user) {
			this.dbData[attrName] = user[attrName]
		}

		// reset lists, because we just changed this.dbData.lists and we need to reload any lists
		this.lists = {}

		var q = queue();

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

		//and fire off the triggers
		this.onAuthFinishTriggers.forEach(function (trigger) {
			trigger.trigger();
		}.bind(this))

		//remove all triggers on success
		this.onAuthFinishTriggers = []

		this.saveData()

		q.awaitAll(function (err) {
			return callback(err, this)
		}.bind(this))
	}.bind(this))
};


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


User.prototype.loadList = function (listName, callback) {
	if (!callback) {
		callback = function () {}
	};

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

	this.ensureList(listName)

	this.lists[listName].dataStatus = macros.DATASTATUS_LOADING

	// wait data downloaded from server to run this
	this.onAuthFinish(this.constructor.name, function () {
		var q = queue()

		//fetch all the class data from the _id's in the user watch list
		this.dbData.lists[listName].classes.forEach(function (classMongoId) {
			q.defer(function (callback) {
				Class.create({
					_id: classMongoId
				}).download(function (err, aClass) {
					if (err) {
						return callback(err)
					}

					this.lists[listName].classes.push(aClass);
					callback()
				}.bind(this))
			}.bind(this))
		}.bind(this))


		//same thing for the sections
		this.dbData.lists[listName].sections.forEach(function (sectionMongoId) {
			q.defer(function (callback) {
				Section.create({
					_id: sectionMongoId
				}).download(function (err, section) {
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
};

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

			//only include if not already in there
			//cant use _.uniq because there could be different instances of the same class
			if (_.filter(classes, {
					_id: aClass._id
				}).length === 0) {
				classes.push(aClass)
			}
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
	
	if (classes.length == 0 && sections.length == 0) {
		console.log("addto lists called with no classes or section");
		return callback()
	};

	this.loadList(listName, function (err) {
		if (err) {
			return callback(err)
		}


	this.ensureList(listName)


		var initClassCount = this.lists[listName].classes.length
		var initSectionCount = this.lists[listName].sections.length

		var classIds = [];
		classes.forEach(function (aClass) {
			if (!aClass._id) {
				elog("Cant save ",aClass,'because it dosent have an _id!')
			};
			classIds.push(aClass._id)
		}.bind(this))


<<<<<<< HEAD
		var sectionIds = [];
		sections.forEach(function (section) {
			if (!section._id) {
				elog("Cant save ",section,'because it dosent have an _id!')
			};
			sectionIds.push(section._id)
		}.bind(this))

		//add the seciton, but make sure to not add duplicate sectin
		//it could be a different instance of that same section
		sections.forEach(function (section) {
			if (_.filter(this.lists[listName].sections, {
					_id: section._id
				}).length === 0) {
				this.lists[listName].sections.push(section)
			}
		}.bind(this))
=======
	// add to this.lists if this.lists is done downloading
	//add the section, but make sure to not add duplicate section
	//it could be a different instance of that same section
	if (this.lists[listName].dataStatus == macros.DATASTATUS_DONE) {
		sections.forEach(function (section) {
			if (_.filter(this.lists[listName].sections, {
					_id: section._id
				}).length === 0) {
				this.lists[listName].sections.push(section)
			}
		}.bind(this))

		classes.forEach(function (aClass) {
			if (_.filter(this.lists[listName].classes, {
					_id: aClass._id
				}).length === 0) {
				this.lists[listName].classes.push(aClass)
			}
		}.bind(this))
	}
	else if (this.lists[listName].dataStatus == macros.DATASTATUS_LOADING) {
		elog('told to add to list that was loading', classes, sections, listName, this.dbData.lists);
	}
>>>>>>> prod

		classes.forEach(function (aClass) {
			if (_.filter(this.lists[listName].classes, {
					_id: aClass._id
				}).length === 0) {
				this.lists[listName].classes.push(aClass)
			}
		}.bind(this))


		//add any classes given to both this.lists and this.dbData.lists
		this.dbData.lists[listName].classes = _.uniq(this.dbData.lists[listName].classes.concat(classIds))


		//add any sections given to both this.lists and this.dbData.lists
		this.dbData.lists[listName].sections = _.uniq(this.dbData.lists[listName].sections.concat(sectionIds))


<<<<<<< HEAD
		ga('send', {
			'hitType': 'pageview',
			'page': '/addToList/' + listName + '/',
			'title': 'Coursepro.io'
		});


		request({
			url: '/log',
=======
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
			elog("ERROR: couldn't log addToList :(", err, response, body);
		}
	}.bind(this))

	if (initClassCount == finalClassCount && initSectionCount == finalSectionCount) {
		console.log("warning only added classes that already existed, still telling server");
		// return callback()
	};

	if (this.getAuthenticated()) {
		this.sendRequest({
			url: '/addToUserLists',
			isMsg: true,
>>>>>>> prod
			body: {
				type: 'addToList',
				initClassCount: initClassCount,
				initSectionCount: initSectionCount,
				finalClassCount: this.lists[listName].classes.length,
				finalSectionCount: this.lists[listName].sections.length
			},
			useCache: false
		}, function (err, response) {
			if (err) {
				elog("ERROR: couldn't log addToList :(", err, response, body);
			}
<<<<<<< HEAD
		}.bind(this))

		if (this.getAuthenticated()) {
			this.sendRequest({
				url: '/addToUserLists',
				isMsg: true,
				body: {
					listName: listName,
					classes: classIds,
					sections: sectionIds
				}
			}, callback)
		}
		else {
			this.saveToLocalStorage()
			return callback()
		}

	}.bind(this))

=======
		}, callback)
	}
	else {
		this.saveData()
		return callback()
	}
>>>>>>> prod
};

//can either be a class or a section
// User.prototype.isAuthAndLoaded = function (instance) {
//     if (!this.getAuthenticated()) {
//         elog("assertAuthAndLoaded called when not authenticated!");
//         return null;
//     }

//     if (instance.dataStatus !== macros.DATASTATUS_DONE) {
//         elog('assertAuthAndLoaded given ', instance)
//         return false;
//     };
//     return true;
// };

User.prototype.removeFromList = function (listName, classes, sections, callback) {
	if (!callback) {
		callback = function () {}
	}

	this.ensureList(listName)

	var initClassCount = this.lists[listName].classes.length
	var initSectionCount = this.lists[listName].sections.length

	var classIds = [];
	classes.forEach(function (aClass) {
		classIds.push(aClass._id)
	}.bind(this))

	var sectionIds = [];
	sections.forEach(function (section) {
		sectionIds.push(section._id)
	}.bind(this))

	classIds.forEach(function (classId) {

		//remove it from this.lists
		var matchingClasses = _.filter(this.lists[listName].classes, {
			_id: classId
		});

		_.pullAll(this.lists[listName].classes, matchingClasses)

		//and this.dbData.lists
		_.pull(this.dbData.lists[listName].classes, classId)
	}.bind(this))

	sectionIds.forEach(function (sectionId) {

		//remove it from this.lists
		var matchingSections = _.filter(this.lists[listName].sections, {
			_id: sectionId
		});

		_.pullAll(this.lists[listName].sections, matchingSections)

		//and this.dbData.lists
		_.pull(this.dbData.lists[listName].sections, sectionId)
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
			elog("ERROR: couldn't log removeFromList :(", err, response, body);
		}
	}.bind(this))


	if (this.getAuthenticated()) {
		this.sendRequest({
			url: '/removeFromUserLists',
			isMsg: true,
			body: {
				listName: listName,
				classes: classIds,
				sections: sectionIds
			}
		}, callback)
	}
	else {
		this.saveData()
		return callback()
	}
};



User.prototype.getListIncludesClass = function (listName, tree) {
	// if (!this.isAuthAndLoaded(tree)) {
	//     return;
	// };

	this.ensureList(listName)

	if (_(this.dbData.lists[listName].classes).includes(tree._id)) {
		return true;
	}
	else {
		return false;
	}
};


User.prototype.getListIncludesSection = function (listName, section) {
	// if (!this.getAuthenticated(section)) {
	//     return null;
	// }

	this.ensureList(listName)

	if (_(this.dbData.lists[listName].sections).includes(section._id)) {
		return true;
	}
	else {
		return false;
	}
};

User.prototype.getList = function (listName) {
	// if (!this.getAuthenticated()) {
	//     return null;
	// }

	this.ensureList(listName)

	return this.lists[listName]
};

// User.prototype.setListIncludesSection = function (listName, section) {
//  if (!this.isAuthAndLoaded(section)) {
//      return null;
//  }

//  //and tell the server
//  this.addToList(listName, [], [section], function (err) {
//      if (err) {
//          console.log("ERROR", err);
//      };
//  }.bind(this))
// };

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
		this.addToList(listName, [section.classInstance], [section], function (err) {
			callback(err)
		}.bind(this))

	}
};

User.prototype.toggleListContainsClass = function (listName, aClass, addSections, callback) {
	if (!callback) {
		callback = function () {}
	}

	aClass.loadSections(function (err) {
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
	return this.dbData.vars[name];
};

User.prototype.setValue = function (name, value, callback) {
	if (!callback) {
		callback = function () {}
	};


	this.dbData.vars[name] = value;

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
		this.saveData()
		return callback()
	}

};

User.prototype.User = User;
module.exports = new User();
