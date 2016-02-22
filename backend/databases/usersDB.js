'use strict';
var _ = require('lodash')
var assert = require('assert');
var async = require('async');
var googleAuthLibrary = require('google-auth-library')
var queue = require('d3-queue').queue;
var diff = require('deep-diff').diff

var BaseDB = require('./baseDB').BaseDB;
var emailMgr = require('../emailMgr');

var googleAuth = new googleAuthLibrary()
var OAuth2 = new googleAuth.OAuth2()


function UsersDB() {

	//cache of user data
	//maps class._id to users
	//and section._id to users
	this.classWatchCache = {
		classes: {},
		sections: {},
		lastUpdateTime: 0,
		timeout: 300000 // 5 min
	};


	this.tableName = 'users'
	BaseDB.prototype.constructor.apply(this, arguments);

	this.usersSchema = {
		ips: [],
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


// things to store now:
// email (required)
//loginKey = string, required when authorized = true
// authorized = true or false/undefined, determins if a user has proven to be this user
//googleId = string, present when authorized = true

// ips = [] #going to be used for neat location graphs and automatically determining which college people go to maybe
// subscriptions = {everything:true,specificColleges:['neu.edu','neu.edu/cps','sju.edu'],somethingelse:true}. at min it is {}
//right now the only one that is used is [everything]


//watching = {
// this does not go down on unwatch
// watchCount : {
// termId:int
// }
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
			console.log("WARNING ignoring more than idToken on user find", userData, config);
			console.trace();
		};

		this.authenticateUser(userData.idToken, function (err, doc) {
			callback(err, doc)
		}.bind(this))
		return;
	}

	//only use one of the keys for each row, in this order
	var lookupValues = {};
	if (userData._id) {
		lookupValues._id = userData._id
	}
	else if (userData.googleId) {
		lookupValues.googleId = userData.googleId;
	}
	else if (userData.loginKey) {
		lookupValues.loginKey = userData.loginKey;
	}
	else if (userData.email) {
		lookupValues.email = userData.email;
	}
	//valid lookup terms is checked above


	//check for at least one of them is handled by this call
	BaseDB.prototype.find.call(this, lookupValues, config, function (err, doc) {
		if (err) {
			console.log('lookupUser error on this.find', err);
			return callback(err)
		}

		if (!doc) {
			return callback(null, null);
		}
		if (lookupValues._id || lookupValues.googleId) {
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
			if (!_(doc.ips).includes(userData.ip)) {
				doc.ips.push(userData.ip)
			}

			doc.subscriptions.everything = true

		}
		else {

			//insert new user to db
			sendThanksEmail = true;

			doc = this.createBaseUserData()

			doc.ips.push(userData.ip)
			doc.email = userData.email
			doc.subscriptions.everything = true;

		}

		if (sendThanksEmail) {
			emailMgr.sendThanksForRegistering(userData.email);
		}

		this.updateDatabase(doc, originalDoc, function (err, newDoc) {
			if (err) {
				console.log('wtf error', err);
				return callback(err);
			}

			return callback();

		}.bind(this))
	}.bind(this))
}


UsersDB.prototype.unsubscribe = function (userData, callback) {
	if (!userData.loginKey) {
		return callback('unsubscribe without loginKey is not implemented!');
	}

	this.find({
		loginKey: userData.loginKey
	}, {}, function (err, userDBData) {
		if (err) {
			console.log('nedb error couldnt find user with id ', userData, err);
			return callback(err);
		}

		var originalUserDBData = _.cloneDeep(userDBData);

		if (!userDBData) {
			console.log('tried to unsubscribe user that didn\'t exist ...', userData);
			return callback(JSON.stringify({
				error: 'user not found'
			}));
		}

		//turn off the subscriptions, but don't remove the email
		userDBData.subscriptions.everything = false;

		this.updateDatabase(userDBData, originalUserDBData, function (err, newDoc) {
			if (err) {
				console.log('update db error', err);
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

UsersDB.prototype.getUsersWatchCache = function (callback) {

	var currTime = new Date().getTime()

	//if class list is too old
	if (this.classWatchCache.lastUpdateTime + this.classWatchCache.timeout < currTime) {
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
				if (!user.lists || !user.lists.watching) {
					return;
				};


				user.lists.watching.classes.forEach(function (_id) {

					//create the list if it dosent exist
					if (!this.classWatchCache.classes[_id]) {
						this.classWatchCache.classes[_id] = []
					}

					//add this user to the list
					this.classWatchCache.classes[_id].push(user)
				}.bind(this))

				user.lists.watching.sections.forEach(function (_id) {


					if (!this.classWatchCache.sections[_id]) {
						this.classWatchCache.sections[_id] = []
					}

					//add this user to the list
					this.classWatchCache.sections[_id].push(user)

				}.bind(this))

			}.bind(this))

			this.classWatchCache.lastUpdateTime = currTime
			callback(null, this.classWatchCache)
		}.bind(this))
	}
	else {
		callback(null, this.classWatchCache)
	}
};

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

	var emails = [];


	if (idUsersMap[newDataClone._id]) {
		idUsersMap[newDataClone._id].forEach(function (user) {
			console.log('class/section ', newDataClone._id, 'was updated and ', user.email, 'was watching!');
			emails.push(user.email)
		}.bind(this))
	}

	if (emails.length != 0) {
		console.log("data link:", newData.url);
	};

	return callback(null, emails, differences);
};

UsersDB.prototype.classUpdated = function (oldData, newData, callback) {
	if (!callback) {
		callback = function () {}
	};


	this.getUsersWatchCache(function (err, watchCache) {
		if (err) {
			return callback(err)
		}

		this.rowUpdatedTrigger(oldData, newData, watchCache.classes, function (err, emails, diff) {
			if (err) {
				return callback(err)
			}
			if (!emails) {
				return callback();
			};

			//calculate email content here
			emailMgr.sendClassUpdatedEmail(emails, oldData, newData, diff);

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

		this.rowUpdatedTrigger(oldData, newData, watchCache.sections, function (err, emails, diff) {
			if (err) {
				console.log(err)
				return callback(err)
			}
			if (!emails || emails.length === 0) {
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
			emailMgr.sendSectionUpdatedEmail(emails, oldData, newData, diff);

			return callback()


		}.bind(this))

	}.bind(this));
}


UsersDB.prototype.addIdsToLists = function (listName, classMongoIds, sectionMongoIds, loginKey, callback) {
	// http://stackoverflow.com/questions/9759972/what-characters-are-not-allowed-in-mongodb-field-names
	if (_(listName).includes('.') || listName[0] == '$') {
		return callback('invalid list name', listName)
	};


	this.find({
			loginKey: loginKey
		}, {},
		function (err, user) {
			if (err) {
				return callback(err)
			}
			if (!user) {
				return callback('no user found')
			};
			var originalDoc = _.cloneDeep(user);

			//create the list if it does not exist
			if (!user.lists[listName]) {
				user.lists[listName] = {
					classes: [],
					sections: []
				}
			};

			if (listName == 'watching' && user.lists[listName].classes.length + classMongoIds.length > 10) {
				console.log("user", user.email, 'is already watching to many classes', user.lists[listName].classes, classMongoIds)
				return callback(null, 'Can\'t watch more classes because too many classes are being watched. The current limit is 10 classes.')
			}

			var numClassesAdded = 0;
			classMongoIds.forEach(function (classMongoId) {
				if (!_(user.lists[listName].classes).includes(classMongoId)) {
					numClassesAdded++;
					user.lists[listName].classes.push(classMongoId)
				}
			}.bind(this))


			var numSectionsAdded = 0;
			sectionMongoIds.forEach(function (sectionMongoId) {
				if (!_(user.lists[listName].sections).includes(sectionMongoId)) {
					numSectionsAdded++;
					user.lists[listName].sections.push(sectionMongoId)
				}
			}.bind(this))

			if (numClassesAdded === 0 && numSectionsAdded === 0) {
				console.log('user ', user.email, 'already has all these ids in list', listName)
				return callback(null, 'All these classes and sections are already in list ' + listName)
			};


			console.log('added ', numClassesAdded, ' and ', numSectionsAdded, ' to user ', user.email, 'list', listName);


			this.updateDatabase(user, originalDoc, function (err, newDoc) {
				return callback(err)
			}.bind(this))

		}.bind(this))
};

UsersDB.prototype.removeIdsFromLists = function (listName, classMongoIds, sectionMongoIds, loginKey, callback) {
	this.find({
			loginKey: loginKey
		}, {},
		function (err, user) {
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


			var originalDoc = _.cloneDeep(user);

			var classRemovedCount = 0;

			//remove the classes
			classMongoIds.forEach(function (classMongoId) {
				if (_(user.lists[listName].classes).includes(classMongoId)) {
					classRemovedCount++;
				}

				_.pull(user.lists[listName].classes, classMongoId)

			}.bind(this))


			var sectionRemovedCount = 0;

			sectionMongoIds.forEach(function (sectionMongoId) {
				if (_(user.lists[listName].sections).includes(sectionMongoId)) {
					sectionRemovedCount++;
				}

				_.pull(user.lists[listName].sections, sectionMongoId)
			}.bind(this))

			console.log(user.email, ' removed', classRemovedCount, ' classes and ', sectionRemovedCount, ' sections from list', listName)

			if (classRemovedCount == 0 && sectionRemovedCount == 0) {
				return callback(null, 'None of these classes and sections are in list ' + listName)
			}

			this.updateDatabase(user, originalDoc, function (err, newDoc) {
				if (err) {
					console.log('ERROR', err)
					return callback(err)
				}

				return callback(null, 'Successfully removed ' + classRemovedCount + ' classes and ' + sectionRemovedCount + ' sections.')
			}.bind(this))
		}.bind(this))
}


// UsersDB.prototype.getUserWatchList = function (loginKey, callback) {
// 	this.find({
// 			loginKey: loginKey
// 		}, {},
// 		function (err, user) {
// 			if (err) {
// 				console.log("ERROR getting user watch list,", loginKey)
// 				return callback(err)
// 			}
// 			if (!user) {
// 				console.log('ERROR couldnt get user watch list of user that dosent exist')
// 				return callback(null, null)
// 			};

// 			return callback(null, user.lists.watching)

// 		}.bind(this))
// };

UsersDB.prototype.setUserVar = function (name, value, loginKey, callback) {
	// http://stackoverflow.com/questions/9759972/what-characters-are-not-allowed-in-mongodb-field-names
	if (_(name).includes('.') || name[0] == '$') {
		return callback('invalid list name', name)
	};


	this.find({
		loginKey: loginKey
	}, {}, function (err, user) {
		if (err) {
			return callback(err)
		}

		if (!user) {
			console.log("no user found in set user var");
			return callback()
		}

		//some verification on the value and name
		if (typeof name != 'string' && name.length > 50) {
			console.log("invalid name/user given", name, value);
			return callback('invalid name')
		}

		if (!_(['string', 'boolean']).includes(typeof value)) {
			console.log("invalid name/user given", name, value);
			return callback('invalid value')
		};

		if (typeof value == 'string' && value.length > 50) {
			console.log("invalid name/user given", name, value);
			return callback('invalid value')
		};

		var originalDoc = _.cloneDeep(user);

		if (!user.vars) {
			user.vars = {}
		};

		user.vars[name] = value;


		this.updateDatabase(user, originalDoc, function (err, newDoc) {
			if (err) {
				console.log('ERROR', err)
				return callback(err)
			}

			return callback(null, 'Successfully set ' + name + ' to ' + value + '.')
		}.bind(this))



	}.bind(this))
};


UsersDB.prototype.loadTestData = function (callback) {

	this.table.insert({
			"_id": "567c58302d8576e482f04e82",
			"ips": ["::1"],
			"email": "rysquash@gmail.com",
			"subscriptions": {},
			"authenticated": true,
			"watching": {
				"watchCount": {},
				"classes": ['567ae73c817bd7005fd101ce', 'hiii'],
				"sections": ['567ae748817bd7005fd103a5', 'hiii']
			},
			"loginKey": "YTWi",
			"loginKeyCreationDate": 1450989615999,
			"name": "Ryan H",
			"googleId": "42",
			"updatedByParent": false
		},
		function (err, newDoc) {
			callback(err);
		}.bind(this))
};

//this function is not ran! yet
UsersDB.prototype.tests = function (callback) {
	return callback()
		// console.log('running the thng thdfasjfklj')


	// this.find({}, {
	// 	shouldBeOnlyOne: false,
	// 	skipValidation: true
	// }, function (err, results) {
	// 	console.log(results)
	// }.bind(this))

	// this.getUsersWatchCache(function (err, data) {
	// 	console.log(err, JSON.stringify(data))
	// 	callback()
	// 		// this.close()
	// }.bind(this))

};


UsersDB.prototype.UsersDB = UsersDB;
module.exports = new UsersDB();


if (require.main === module) {
	// module.exports.tests();
}
