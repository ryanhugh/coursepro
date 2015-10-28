'use strict';
var BaseDB = require('./baseDB').BaseDB;
var emailMgr = require('../emailMgr');
var _ = require('lodash')


function UsersDB () {
	this.filename = 'users.db'
	this.shouldAutoUpdate = false;
	this.peopleCanRegister = true;
	BaseDB.prototype.constructor.apply(this,arguments);
}


// things to store now:
// userId (the long client generated string)
// ips = [] #going to be used for neat location graphs and automatically determining which college people go to
// emails (if they registered for updates)
// subscriptions = {allColleges:true,specificColleges:['neu.edu','neu.edu/cps','sju.edu'],somethingelse:true}

//later when we have account management we can have option to manage/delete/add emails


//prototype constructor
UsersDB.prototype = Object.create(BaseDB.prototype);
UsersDB.prototype.constructor = UsersDB;


UsersDB.prototype.isValidLookupValues = function(lookupValues) {
	
	if (BaseDB.prototype.isValidLookupValues(lookupValues)) {//this returns true if it has a url, which is not valid here!
		return true;
	}
	else if (lookupValues.userId) {
		return true;
	}
	
	//dont allow looking up values by email, don't add password until the site is https
	
	else {
		return false;
	}
};


UsersDB.prototype.subscribeForEverything = function(userData,callback) {
	if (!userData.email || !userData.ip || !userData.userId) {
		console.log('given invalid userData ',userData);
		return callback('invalid user data');
	}
	this.find({
		userId: userData.userId
	},{
		shouldBeOnlyOne:true,
		sanatize:false
	},function(err,userDBData) {
		if (err) {
			console.log('nedb error couldnt find user with id ',userData.userId,err);
			return callback(err);
		}
		
		var originalUserDBData = _.cloneDeep(userDBData);
		
		//didnt find anything, insert new user!
		if (!userDBData) {
			userDBData = {
				userId:userData.userId,
				ips:[userData.ip],
				emails:[userData.email],
				subscriptions:{allColleges:true}
			}
			
			emailMgr.sendThanksForRegistering(userData.email);
		}
		else {
			//no new data lol
			if (_(userDBData.emails).includes(userData.email) && _(userDBData.ips).includes(userData.ip))  {
				console.log(JSON.stringify({type:'updatingUser',warning:'no new data',data:userDBData,userData:userData}));
				return callback();
			}
			
			if (!_(userDBData.ips).includes(userData.ip)) {
				userDBData.ips.push(userData.ip);
			}
			
			if (!_(userDBData.emails).includes(userData.email)) {
				emailMgr.sendThanksForRegistering(userData.email);
				userDBData.emails.push(userData.email);
			}
			
			userDBData.subscriptions.allColleges = true;
		}
		
		
		this.updateDatabase(userDBData,originalUserDBData,function(err,newDoc){
			if (err) {
				console.log('wtf error',err);
				return callback(err);
			}
				
			return callback();
				
		}.bind(this))
		
		
	}.bind(this))
}


UsersDB.prototype.unsubscribe = function(userData,callback){
	if (!userData.userId || !userData.email) {
		return callback('invalid userData');
	}
	
	this.find({
		userId: userData.userId
	},{
		shouldBeOnlyOne:true,
		sanatize:false
	},function(err,userDBData) {
		if (err) {
			console.log('nedb error couldnt find user with id ',userData.userId,err);
			return callback(err);
		}
		
		var originalUserDBData = _.cloneDeep(userDBData);
		
		if (!userDBData) {
			console.log('tried to unsubscribe user that didn\'t exist ...',userData);
			return callback(JSON.stringify({error:'user not found'}));
		}
		
		//remove the given email, if it exists
		_.pull(userDBData.emails,userData.email);
		
		this.updateDatabase(userDBData,originalUserDBData,function(err,newDoc){
			if (err) {
				console.log('update db error',err);
				return callback(err);
			}
			
			return callback();
			
		}.bind(this))
	}.bind(this))
}

// // interval
// UsersDB.prototype.onInterval = function() {
// 	console.log('UPDATING ALL User data !')
// 	this.db.find({}, function (err,docs) {
// 		docs.forEach(function(doc) {
			
// 		}.bind(this));
// 	}.bind(this));
// };




UsersDB.prototype.UsersDB= UsersDB;
module.exports = new UsersDB();


if (require.main === module) {
	module.exports.tests();
}