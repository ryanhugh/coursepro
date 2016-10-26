'use strict';
var _ = require('lodash')
var async = require('async');
var googleAuthLibrary = require('google-auth-library')
var queue = require('d3-queue').queue;
var diff = require('deep-diff').diff
var memoize = require('../../common/memoize')

var macros = require('../macros')
var BaseDB = require('./baseDB').BaseDB;
var emailMgr = require('../emailMgr');

var googleAuth = new googleAuthLibrary()
var OAuth2 = new googleAuth.OAuth2()


function UsersDB() {

	// How long to tkeep a cache of user data, in min. 
	this.CLASS_WATCH_CACHE_TIMEOUT = 5;

	//cache of user data
	//maps class._id to users
	//and section._id to users
	this.classWatchCache = {
		classes: {},
		sections: {},
		lastUpdateTime: 0,
	};


	this.tableName = 'users'
	BaseDB.prototype.constructor.apply(this, arguments);

	this.usersSchema = {
		email: '',
		subscriptions: {},
		authenticated: false,
		lists: {
			// watching: { //optional, created dynamically
			// 	classes: [],
			// 	sections: [],
			// },
			// starred : {	
			// 	classes: [],
			// 	sections: [],
			// }
		},
		vars: {}
	}

	this.ensureDefaultSchema();

}

// April 11, schema example:  (this is same as above)
// {
// 	"ips": [],
// 	"email": "rysquash@gmail.com",
// 	"subscriptions": {},
// 	"authenticated": true,
// 	"lists": {
// 		"watching": {
// 			"classes": ["56f2259aea47044a056a8463"],
// 			"sections": ["56f221bdea47044a05699c39", "56f22599ea47044a056a845b", "56f22156ea47044a056983e5"]
// 		}
// 	},
// 	"name": "Ryan Hughes",
// 	"updatedByParent": false
// }


// things to store now:
// email (required)
//loginKey = string, required when authorized = true
// authorized = true or false/undefined, determins if a user has proven to be this user
//googleId = string, present when authorized = true

// subscriptions = {everything:true,specificColleges:['neu.edu','neu.edu/cps','sju.edu'],somethingelse:true}. at min it is {}
//right now the only one that is used is [everything]


//watching = {
// this does not go down on unwatch
// classes:[_ids of classes]
// sections:[_ids of sections]
// } (at min {})


//later when we have account management we can have option to manage/delete/add emails


//prototype constructor
UsersDB.prototype = Object.create(BaseDB.prototype);
UsersDB.prototype.constructor = UsersDB;


UsersDB.prototype.isValidLookupValues = function (lookupValues) {

	//all of these are unique for each row
	//never send the googleId to the client and don't allow external lookups with googleId (from other server code is ok)
	//ok to send _id to client, but don't allow external lookups either
	if (lookupValues._id || lookupValues.googleId || lookupValues.loginKey || lookupValues.email || lookupValues.idToken) {
		return true;
	}
	else {
		return false;
	}
};

UsersDB.prototype.createBaseUserData = function () {
	return _.cloneDeep(this.usersSchema);
};

UsersDB.prototype.ensureDefaultSchema = function () {
	return;
	this.find({}, {
		shouldBeOnlyOne: false,
		skipValidation: true
	}, function (err, users) {
		if (err) {
			console.log('error!!!?!', err)
			return
		}
		users.forEach(function (user) {
			//make this recursive!!!
			for (var attrName in this.usersSchema) {

			}



		}.bind(this))
	}.bind(this))
};


UsersDB.prototype.getQuery = function (userData) {
	//only use one of the keys for each row, in this order
	if (userData._id) {
		return {
			_id: userData._id
		}
	}
	else if (userData.googleId) {
		return {
			googleId: userData.googleId
		}
	}
	else if (userData.loginKey) {
		return {
			loginKey: userData.loginKey
		}
	}
	else if (userData.email) {
		return {
			email: userData.email
		}
	}
	else {
		elog("ERROR UsersDB userData had no info", userData);
	}
	return {};
};



// TODO: adds some stuff to monk update
// query: queries in this order: _id, googleId, loginKey, email
// config: shouldBeOnlyOne (not sure how this is going to work). maybe just run a find() to get count before the update? and some way to disable the debug mode
// might be able to do this.table.driver.count






//looks up user in database, and ensures that user is same authentication level as the found user in db
//also changes the default to only look up one user, unlike the BaseDB
UsersDB.prototype.find = function (userData, config, callback) {
	if (!config) {
		config = {}
	};

	if (config.shouldBeOnlyOne === undefined) {
		config.shouldBeOnlyOne = true;
	};

	if (userData.idToken) {

		if (_.keys(userData).length !== 1) {
			elog("WARNING ignoring more than idToken on user find", userData, config);
		};

		this.authenticateUser(userData.idToken, function (err, doc) {
			callback(err, doc)
		}.bind(this))
		return;
	}

	if (!config.skipValidation) {
		userData = this.getQuery(userData)
	}


	//check for at least one of them is handled by this call
	BaseDB.prototype.find.call(this, userData, config, function (err, doc) {
		if (err) {
			console.log('lookupUser error on this.find', err);
			return callback(err)
		}

		if (!doc) {
			return callback(null, null);
		}
		if (userData._id || userData.googleId) {
			return callback(null, doc);
		};

		//if both have loginKey, return doc
		//if both not authenticated (both use email), return doc
		//if doc has key and userData does not, return null
		//if doc has email and userData has key, return null, because /auth should insert keys, which means this is probably someone guessing keys

		if (userData.loginKey == doc.loginKey || (!userData.loginKey && !doc.loginKey)) {

			// if (doc.loginKey && config.sanitize) {
			// 	doc.loginKey = undefined
			// }

			return callback(null, doc);
		}
		else {
			console.log('ignoring unauthenticated request for user data', userData, doc)
			return callback('not authenticated');
		}
	}.bind(this));
};




UsersDB.prototype.subscribeForEverything = function (userData, callback) {

	if (!userData.email || !userData.ip) {
		console.log('given invalid userData ', userData);
		return callback('invalid user data');
	}

	this.find(userData, {}, function (err, doc) {
		if (err) {
			console.log('subscribeForEverything error on this.find', err);
			return callback(err)
		}

		var originalDoc = _.cloneDeep(doc);
		var sendThanksEmail = false;

		if (doc) {
			if (!doc.subscriptions.everything) {
				sendThanksEmail = true;
			}

			doc.subscriptions.everything = true

			this.table.update(this.getQuery(userData), {
				$set: {
					"subscriptions.everything": true
				}
			}, {}, function (err, user) {
				if (err) {
					return callback(err)
				}

				if (!user) {
					return callback('no user found')
				};

				console.log("unsubscribed ", user.email, 'from everything');
				return callback(null, 'Successfully unsubscribed.')
			}.bind(this));

		}
		else {

			//insert new user to db
			sendThanksEmail = true;
			doc = this.createBaseUserData()
			doc.email = userData.email
			doc.subscriptions.everything = true;



		}

		if (sendThanksEmail) {
			emailMgr.sendThanksForRegistering(userData.email);
		}

		// this woulnt work if user not in db, need createBaseSchema and upsert if not in at all
		// this.table.update(updateQuery, {
		// 	$set: {
		// 		"subscriptions.everything": true,
		// 		"email":userData.email
		// 	}
		// })

		this.updateDatabase(doc, originalDoc, function (err, newDoc) {
			if (err) {
				console.log('wtf error', err);
				return callback(err);
			}

			return callback();

		}.bind(this))
	}.bind(this))
}



UsersDB.prototype.randomString = function (length) {
	if (!length) {
		length = 400;
	}

	var mask = '';
	mask += 'abcdefghijklmnopqrstuvwxyz';
	mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	mask += '0123456789';

	var result = '';
	for (var i = length; i > 0; --i) result += mask[Math.round(Math.random() * (mask.length - 1))];
	return result;
}


// there is an incredable subtile concurrency bug here that probably wount happen
// if a user dosent exist in db, and logs in with google from 2 different computers at the same time
// 2 this.find() will go off and find nothing, and then come back here, generate 2 login keys, and send them to the user and add them to the db
// resulting in the same user having 2 diff login keys on 2 computers and an email being in the db twice
// havent bothered fixing yet
UsersDB.prototype.authenticateUser = function (idToken, callback) {

	OAuth2.verifyIdToken(idToken, null, function (err, results) {
		if (err) {
			console.log('Warning, error when verifiying Google Id Token', err, results);
			callback('invalid id token')
			return
		}

		var payload = results.getPayload()

		console.log('google login success', payload.email);

		//payload.sub is the id of the google user, and returns the same thing as profile.getId() client side
		//in the db this is stored as googleId

		async.waterfall([
				function (callback) {

					//lookup by googleId, and if not found, lookup by email 

					this.find({
						googleId: payload.sub
					}, {}, function (err, doc) {
						if (err || doc) {
							return callback(err, doc);
						}

						else {
							console.log('failed to find with google id, using email', payload.email)

							this.find({
									email: payload.email
								}, {},
								function (err, doc) {
									return callback(err, doc);
								}.bind(this)
							)
						}
					}.bind(this))
				}.bind(this)
			],
			function (err, doc) {
				if (err) {
					console.log('ERROR userdb error when looking up google id', err, doc);
					return callback('error yo')
				}



				var originalDoc = _.cloneDeep(doc)

				//user didn't exist in db, create it and generate loginKey
				if (!doc) {
					console.log('creating google user ', payload.email, '!')
					doc = this.createBaseUserData()
				}


				if (doc.email && doc.email != payload.email) {
					console.log('WARNING doc.email!=payload.email??', doc, payload)
				}

				if (doc.name && doc.name != payload.name) {
					console.log('WARNING doc.name!=payload.name??', doc, payload)
				}

				if (!doc.loginKey) {
					doc.loginKey = this.randomString()
					doc.loginKeyCreationDate = new Date().getTime()
				}

				if (!doc.unsubscribeKey) {
					doc.unsubscribeKey = this.randomString();
				}

				doc.name = payload.name
				doc.email = payload.email
				doc.googleId = payload.sub
				doc.authenticated = true
				callback(null, doc)

				//don't need callback for db		
				this.updateDatabase(doc, originalDoc);
			}.bind(this))



		// console.log('here:', err, results, results.getEnvelope(), results.getPayload());


		//if not valid check


		//check db for email

		//if in send client loginKey
		//if not in add, create loginKey and loginKeyCreationDate, and send to client

		//add email, name, ^^ and other stuff in users.db to users.db

		//and if not logged in, just store data in localStorage,
		//and upload once logged in


	}.bind(this));
}

UsersDB.prototype.getUsersWatchCache = memoize(function (callback) {

	this.find({}, {
		skipValidation: true,
		shouldBeOnlyOne: false
	}, function (err, results) {
		if (err) {
			return callback(err);
		};
		this.classWatchCache.classes = {};
		this.classWatchCache.sections = {};

		results.forEach(function (user) {
			if (!user.lists || !user.lists[macros.WATCHING_LIST]) {
				return;
			};


			user.lists[macros.WATCHING_LIST].classes.forEach(function (_id) {

				//create the list if it dosent exist
				if (!this.classWatchCache.classes[_id]) {
					this.classWatchCache.classes[_id] = []
				}

				//add this user to the list
				this.classWatchCache.classes[_id].push(user)
			}.bind(this))

			user.lists[macros.WATCHING_LIST].sections.forEach(function (_id) {


				if (!this.classWatchCache.sections[_id]) {
					this.classWatchCache.sections[_id] = []
				}

				//add this user to the list
				this.classWatchCache.sections[_id].push(user)

			}.bind(this))

		}.bind(this))

		callback(null, this.classWatchCache)
	}.bind(this))
}, function () {
	
	var time = Math.floor(Date.now() / (1000 * 60 * this.CLASS_WATCH_CACHE_TIMEOUT))

	// Cache the return value of this function for 5 min
	return time;
});

//users id map is this.classWatchCache.classes or this.classWatchCache.sections
UsersDB.prototype.rowUpdatedTrigger = function (oldData, newData, idUsersMap, callback) {
	if (!oldData) {
		oldData = {}
	};

	var oldDataClone = _.cloneDeep(oldData);
	var newDataClone = _.cloneDeep(newData);

	['lastUpdateTime', 'deps', 'prettyUrl', 'url'].forEach(function (ignoreAttribute) {
		oldDataClone[ignoreAttribute] = null;
		newDataClone[ignoreAttribute] = null;
	}.bind(this))

	var differences = diff(oldDataClone, newDataClone);

	// console.log('diff here:', differences, newDataClone, oldDataClone)
	// console.trace()

	if (!differences) {
		return callback()
	};

	var users = [];


	if (idUsersMap[newDataClone._id]) {
		idUsersMap[newDataClone._id].forEach(function (user) {
			console.log('class/section ', newDataClone._id, 'was updated and ', user.email, 'was watching!');
			users.push(user)
		}.bind(this))
	}

	if (users.length != 0) {
		console.log("data link:", newData.url);
	};

	return callback(null, users, differences);
};

UsersDB.prototype.classUpdated = function (oldData, newData, callback) {
	if (!callback) {
		callback = function () {}
	};


	this.getUsersWatchCache(function (err, watchCache) {
		if (err) {
			return callback(err)
		}

		this.rowUpdatedTrigger(oldData, newData, watchCache.classes, function (err, users, diff) {
			if (err) {
				return callback(err)
			}
			if (!users) {
				return callback();
			};

			//calculate email content here
			emailMgr.sendClassUpdatedEmail(users, oldData, newData, diff);

			return callback()


		}.bind(this))
	}.bind(this));
}


UsersDB.prototype.sectionUpdated = function (oldData, newData, callback) {
	if (!callback) {
		callback = function () {}
	};


	this.getUsersWatchCache(function (err, watchCache) {
		if (err) {
			return callback(err)
		}

		this.rowUpdatedTrigger(oldData, newData, watchCache.sections, function (err, users, diff) {
			if (err) {
				console.log(err)
				return callback(err)
			}
			if (!users || users.length === 0) {
				return callback();
			};

			var shouldSendEmail = false;

			//lhs is old, and rhs is new
			diff.forEach(function (aDiff) {
				if (aDiff.path.length == 1 && aDiff.path[0] == 'seatsRemaining') {

					//only send email if was <=0 and increase to above 0
					// "increased to a positive number" is goal, but then like 25 -> 26 would fire...
					if (aDiff.lhs <= 0 && aDiff.rhs > 0) {
						shouldSendEmail = true;
					}
					else {
						console.log('WARNING Not sending email for diff', aDiff)
					}
				}
				else if (aDiff.path.length == 1 && aDiff.path[0] == 'waitRemaining') {

					//only send email if was <=0 and increase to above 0
					// "increased to a positive number" is goal, but then like 25 -> 26 would fire...
					if (aDiff.lhs <= 0 && aDiff.rhs > 0) {
						shouldSendEmail = true;
					}
					else {
						console.log('WARNING Not sending email for diff', aDiff)
					}
				}
				else {
					shouldSendEmail = true;
				}
			}.bind(this))

			if (!shouldSendEmail) {
				return callback()
			};

			//calculate email content here
			emailMgr.sendSectionUpdatedEmail(users, oldData, newData, diff);

			return callback()


		}.bind(this))

	}.bind(this));
}


UsersDB.prototype.addIdsToLists = function (listName, classMongoIds, sectionMongoIds, loginKey, callback) {

	// Instead of doing a read and then modify the row in javascript here, and then send it back to mongo to do a override of the row
	// we tell mongo what needs to be changed
	// 
	// This is faster and avoids the locking issues we get with each write requiring a read -> js -> write
	var toAddToSet = {};
	toAddToSet["lists." + listName + ".classes"] = {
		$each: classMongoIds
	}

	toAddToSet["lists." + listName + ".sections"] = {
		$each: sectionMongoIds
	}

	this.table.findAndModify({
		loginKey: loginKey
	}, {
		$addToSet: toAddToSet
	}, {}, function (err, user) {
		if (err) {
			return callback(err)
		}

		if (!user) {
			return callback('no user found')
		};


		console.log('tried to add ', classMongoIds.length, ' and ', sectionMongoIds.length, ' to user ', user.email, 'list', listName);

		var didChangeUser = false;
		if (user.lists[listName]) {
			console.log('list used to have ', user.lists[listName].classes.length, 'classes and ', user.lists[listName].sections.length, 'sections');

			classMongoIds.forEach(function (mongoId) {
				if (!_(user.lists[listName].classes).includes(mongoId)) {
					didChangeUser = true;
				}
			}.bind(this))

			sectionMongoIds.forEach(function (mongoId) {
				if (!_(user.lists[listName].sections).includes(mongoId)) {
					didChangeUser = true;
				}
			}.bind(this))
		}
		else {
			console.log('lists did not exist before now');
			didChangeUser = true
		}

		if (!didChangeUser) {
			console.log('user ', user.email, 'is already watching class and sections', classMongoIds, sectionMongoIds)
			return callback(null, 'All these classes and sections are already being watched.')
		}
		else {
			return callback();
		}
	}.bind(this));
};


UsersDB.prototype.removeIdsFromLists = function (listName, classMongoIds, sectionMongoIds, query, callback) {
	var toPull = {};
	toPull["lists." + listName + ".classes"] = classMongoIds
	toPull["lists." + listName + ".sections"] = sectionMongoIds

	this.table.findAndModify(query, {
		$pullAll: toPull
	}, {
		"new": true
	}, function (err, user) {
		setTimeout(function () {
			if (err) {
				return callback(err)
			}

			if (!user) {
				return callback('no user found')
			};

			if (!user.lists[listName]) {
				console.log("Warning: told to remove class from non existend list on user", user.googleId);
				return callback(null, 'None of these classes and sections are in list ' + listName)
			};

			console.log(user.email, 'tried removed', classMongoIds.length, ' classes and ', sectionMongoIds.length, ' sections from list', listName)

			return callback(null, 'Successfully removed ' + classMongoIds.length + ' classes and ' + sectionMongoIds.length + ' sections.')
		}.bind(this), 0)
	}.bind(this));
}

// make sure name is alphanumeric! (theres a check in server.js)
UsersDB.prototype.setUserVar = function (name, value, loginKey, callback) {

	//some verification on the value and name
	if (typeof name != 'string' && name.length > 50) {
		console.log("invalid name/user given", name, value, 'for user ', loginKey);
		return callback('invalid name')
	}

	if (!_(['string', 'boolean']).includes(typeof value)) {
		console.log("invalid name/user given", name, value, 'for user ', loginKey);
		return callback('invalid value')
	};

	if (typeof value == 'string' && value.length > 50) {
		console.log("invalid name/user given", name, value, 'for user ', loginKey);
		return callback('invalid value')
	};

	var toSet = {};

	toSet["vars." + name] = value;

	this.table.findAndModify({
		loginKey: loginKey
	}, {
		$set: toSet
	}, {
		"new": true
	}, function (err, user) {
		if (err) {
			return callback(err)
		}

		if (!user) {
			return callback('no user found')
		};

		console.log('Set ', user.email, ' var ', name, 'to ', value);

		return callback(null, 'Successfully set ' + name + ' to ' + value + '.')
	}.bind(this));

};




UsersDB.prototype.UsersDB = UsersDB;
module.exports = new UsersDB();


if (require.main === module) {
	// module.exports.tests();
}
