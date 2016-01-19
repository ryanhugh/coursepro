'use strict';
var queue = require('queue-async')
var macros = require('./macros')

var request = require('./request')
var Class = require('./Class')
var Section = require('./Section')

function User() {

	//all the data on the db schema for users is copied to this object
	//and updated on some events
	// perhaps change vv to dataChangeTrigger + type? no, because there is only 1 state, authenticated+with data, or neither. 

	this.onAuthenticateTriggers = []

	//data in the server
	//email and name are copied to this when done loading
	//sections and classes watching, when loaded, are copied to this.watching
	this.dbData = {
		lists: {}
	}

	this.email = ''
	this.name = ''

	//here, actual instances of classes and sections are stored
	this.lists = {
		watching: {
			classes: [],
			sections: [],
			dataStatus: macros.DATASTATUS_NOTSTARTED
		},
		saved: {
			classes: [],
			sections: []
		}
	}

	//load from localStorage
	this.loadFromLocalStorage();

	//download data from server on init, if have loginKey
	if (this.getAuthenticated()) {
		this.download()
	}
}

User.prototype.loadFromLocalStorage = function () {
	if (!localStorage.user) {
		return;
	}

	var userData = JSON.parse(localStorage.user);

	for (var attrName in userData) {
		this.dbData[attrName] = userData[attrName]
	}
}

User.prototype.dataUpdated = function () {
	//save login key to localstorage
	if (this.dbData.loginKey) {
		localStorage.loginKey = this.dbData.loginKey
	}

	this.email = this.dbData.email;
	this.name = this.dbData.name;


	//and fire off the triggers
	this.onAuthenticateTriggers.forEach(function (trigger) {
		trigger.trigger();
	}.bind(this))

	//remove all triggers on success
	this.onAuthenticateTriggers = []
};



//getters and setters for localStorage stuff
User.prototype.getAuthenticated = function () {
	if (localStorage.loginKey) {
		return true;
	}
	else {
		return false;
	}
};


//fired when authenticated
//fires with an error if google auth faied, and does not remove trigger
//fires with success if it worked (and /getUser worked), and then removes trigger
User.prototype.onAuthenticate = function (name, trigger) {
	//lol just fire it now
	if (this.getAuthenticated()) {
		trigger();
		return;
	}
	else {

		this.onAuthenticateTriggers.push({
			name: name,
			trigger: trigger
		})

	}

};
User.prototype.removeTriggers = function (name) {
	var triggersToRemove = _.filter(this.onAuthenticateTriggers, {
		name: name
	})

	triggersToRemove.forEach(function (trigger) {
		_.pull(this.onAuthenticateTriggers, trigger)
	}.bind(this))
};


//this is called direcly from the signed in with google.js
User.prototype.signedInWithGoogle = function (err, idToken) {
	if (err) {
		console.log("ERROR", err);

		//call all the callbacks
		this.onAuthenticateTriggers.forEach(function (trigger) {
			trigger.trigger(err);
		}.bind(this))

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
	config.auth = true;

	if (config.tree) {
		config.body = config.tree.getIdentifer().full.obj;
	}

	request(config, function (err, response) {
		if (err) {
			elog('ERROR', err)
			return callback(err);
		}

		//if its a msg, return the error msg or the success msg
		if (config.isMsg) {
			if (response.error) {
				console.log('ERROR look at the server logs', response)
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


	if (!this.getAuthenticated() && !config.body.idToken) {
		console.log("ERROR not authenticated cant get user data");
		return callback('Cannot get user data without being signed in')
	};

	config.url = '/getUser'

	this.sendRequest(config, function (err, user) {
		if (err) {
			console.log('ERROR', err)
			return callback(err)
		}

		if (!user.loginKey) {
			console.log("didn't get a login key?", user, err)
			return callback('error')
		}



		//copy the attrs to this.dbData
		for (var attrName in user) {
			if (!_.isEqual(this.dbData[attrName], user[attrName]) && this.dbData[attrName] !== undefined) {
				console.log("ERROR overrideing value", attrName, this.dbData[attrName], user[attrName]);
			}
			this.dbData[attrName] = user[attrName]
		}

		this.dataUpdated()


		return callback(null, this)
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

	//add check for dataStatus

	if (this.lists[listName]) {

		if (this.lists[listName].dataStatus === macros.DATASTATUS_DONE) {
			return callback()
		};

		if (this.lists[listName].dataStatus !== macros.DATASTATUS_NOTSTARTED && this.lists[listName].dataStatus !== undefined) {
			elog('loadWatching called when data status was', this.lists[listName].dataStatus)
			return callback('internal error');
		};
	};

	if (!this.dbData.lists[listName]) {
		return callback()
	};


	this.lists[listName].dataStatus = macros.DATASTATUS_LOADING


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
			elog(err, 'when loading watching classes')
			return callback(err)
		}
		this.lists[listName].dataStatus = macros.DATASTATUS_DONE;
		callback()
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
			if (_.filter(classes, {
					_id: aClass._id
				}).length === 0) {
				classes.push(aClass)
			}
		}.bind(this))

		// classes = classes.concat(this.lists[listName].classes)
	}

	return classes;
};

User.prototype.ensureList = function (listName) {
	if (!this.lists[listName]) {
		this.lists[listName] = {
			classes: [],
			sections: []
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
	this.ensureList(listName)

	var classIds = [];
	classes.forEach(function (aClass) {
		classIds.push(aClass._id)
	}.bind(this))


	var sectionIds = [];
	sections.forEach(function (section) {
		sectionIds.push(section._id)
	}.bind(this))


	//add any classes given to both this.lists and this.dbData.lists
	this.lists[listName].classes = _.uniq(this.lists[listName].classes.concat(classes))
	this.dbData.lists[listName].classes = _.uniq(this.dbData.lists[listName].classes.concat(classIds))


	//add any sections given to both this.lists and this.dbData.lists
	this.lists[listName].sections = _.uniq(this.lists[listName].sections.concat(sections))
	this.dbData.lists[listName].sections = _.uniq(this.dbData.lists[listName].sections.concat(sectionIds))


	this.sendRequest({
		url: '/addToUserLists',
		isMsg: true,
		body: {
			listName: listName,
			classes: classIds,
			sections: sectionIds
		}
	}, callback)
};

//can either be a class or a section
User.prototype.isAuthAndLoaded = function (instance) {
	if (!this.getAuthenticated()) {
		elog("assertAuthAndLoaded called when not authenticated!");
		return null;
	}

	if (instance.dataStatus !== macros.DATASTATUS_DONE) {
		elog('assertAuthAndLoaded given ', instance)
		return false;
	};
	return true;
};

User.prototype.removeFromList = function (listName, classes, sections, callback) {
	this.ensureList(listName)

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



	this.sendRequest({
		url: '/removeFromUserLists',
		isMsg: true,
		body: {
			listName: listName,
			classes: classIds,
			sections: sectionIds
		}
	}, callback)
};



User.prototype.getListIncludesClass = function (listName, tree) {
	if (!this.isAuthAndLoaded(tree)) {
		return;
	};

	this.ensureList(listName)

	if (_(this.dbData.lists[listName].classes).includes(tree._id)) {
		return true;
	}
	else {
		return false;
	}
};


User.prototype.getListIncludesSection = function (listName, section) {
	if (!this.isAuthAndLoaded(section)) {
		return null;
	}

	this.ensureList(listName)

	if (_(this.dbData.lists[listName].sections).includes(section._id)) {
		return true;
	}
	else {
		return false;
	}
};


// User.prototype.setListIncludesSection = function (listName, section) {
// 	if (!this.isAuthAndLoaded(section)) {
// 		return null;
// 	}

// 	//and tell the server
// 	this.addToList(listName, [], [section], function (err) {
// 		if (err) {
// 			console.log("ERROR", err);
// 		};
// 	}.bind(this))
// };

User.prototype.toggleListContainsSection = function (listName, section) {
	if (!this.isAuthAndLoaded(section)) {
		return null;
	}

	//if watching, unwatch it
	if (this.getListIncludesSection(listName, section)) {

		this.removeFromList(listName, [], [section], function (err) {
			if (err) {
				console.log("ERROR", err);
			};
		}.bind(this))

	} 
	//add it to the watch list
	//and tell server
	else {
		this.addToList(listName, [section.classInstance], [section], function (err) {
			if (err) {
				console.log("ERROR", err);
			};
		}.bind(this))

	}
};

User.prototype.toggleListContainsClass = function (listName, aClass) {
	if (!this.isAuthAndLoaded(aClass)) {
		return null;
	}

	//if watching, unwatch it
	if (this.getListIncludesClass(listName, aClass)) {

		//removing a class also removes all of its sections
		this.removeFromList(listName, [aClass], aClass.sections, function (err) {
			if (err) {
				console.log("ERROR", err);
			};
		}.bind(this))

	}
	//add it to the watch list
	//and tell server
	else {

		this.addToList(listName, [aClass], [], function (err) {
			if (err) {
				console.log("ERROR", err);
			};
		}.bind(this))
	}
};

User.prototype.User = User;
module.exports = new User();