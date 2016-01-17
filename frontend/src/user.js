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
	this.dbData = {}

	this.email = ''
	this.name = ''

	this.watching = {
		classes: [],
		sections: [],
		dataStatus: macros.DATASTATUS_NOTSTARTED
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
	if (this.loginKey) {
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
	var triggersToRemove = _.where(this.onAuthenticateTriggers, {
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
		idToken: idToken
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
		config.body = tree.getIdentifer().required.obj;
		config.resultsQuery = tree.getIdentifer().optional.obj;
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
User.prototype.download = function (callback) {
	if (!callback) {
		callback = function () {}
	};


	if (!this.getAuthenticated()) {
		console.log("ERROR not authenticated cant get user data");
		return callback('Cannot get user data without being signed in')
	};

	this.sendRequest({
		url: '/getUser',
	}, function (err, user) {
		if (err) {
			console.log('ERROR', err)
			return callback(err)
		}

		if (!user.loginKey) {
			console.log("didn't get a login key?", user, err)
			return;
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



//sends post request
User.prototype.addClassToWatchList = function (tree, callback) {
	this.sendRequest({
		url: '/addClassToWatchList',
		isMsg: true,
		tree: tree
	}, callback)
};


User.prototype.removeClassFromWatchList = function (tree, callback) {
	this.sendRequest({
		url: '/removeClassFromWatchList',
		isMsg: true,
		tree: tree
	}, callback)
};


User.prototype.loadWatching = function (callback) {
	if (!callback) {
		callback = function () {}
	};

	if (this.watching.dataStatus === macros.DATASTATUS_DONE) {
		return callback()
	};

	if (this.watching.dataStatus !== macros.DATASTATUS_NOTSTARTED) {
		elog('loadWatching called when data status was', this.watching.dataStatus)
		return callback('internal error');
	};

	this.watching.dataStatus = macros.DATASTATUS_LOADING


	var q = queue()

	//fetch all the class data from the _id's in the user watch list
	this.dbData.watching.classes.forEach(function (classMongoId) {
		q.defer(function (callback) {
			Class.create({
				_id: classMongoId
			}).download(function (err, aClass) {
				if (err) {
					return callback(err)
				}

				this.watching.classes.push(aClass);
				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))


	//same thing for the sections
	this.dbData.watching.sections.forEach(function (sectionMongoId) {
		q.defer(function (callback) {
			Section.create({
				_id: sectionMongoId
			}).download(function (err, section) {
				if (err) {
					return callback(err)
				}
				this.watching.sections.push(section)
				callback()
			}.bind(this))
		}.bind(this))
	}.bind(this))

	q.awaitAll(function (err) {
		if (err) {
			this.watching.dataStatus = macros.DATASTATUS_FAIL;
			elog(err, 'when loading watching classes')
			return callback(err)
		}
		this.watching.dataStatus = macros.DATASTATUS_DONE;
		callback()
	}.bind(this))
};




User.prototype.isWatchingSection = function(section) {
	if (!this.getAuthenticated()) {
		elog("isWatchingSection called when not authenticated!");
		return null;
	}

	if (section.dataStatus !== macros.DATASTATUS_DONE) {
		elog('isWatchingSection given ',section)
	};

	if (_(this.dbData.watching.sections).includes(section._id)) {
		return true;
	}
	else {
		return false;
	}

};




User.prototype.User = User;
module.exports = new User();