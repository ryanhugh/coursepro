'use strict';
var Datastore = require('nedb');
var fs = require('fs');
var _ = require('lodash');

var BaseDB = require('./baseDB').BaseDB;


function CollegeNamesDB () {
	this.filename = 'collegeNames.db'
	this.shouldAutoUpdate = false;
	this.peopleCanRegister = false;
	BaseDB.prototype.constructor.apply(this,arguments);
}


//prototype constructor
CollegeNamesDB.prototype = Object.create(BaseDB.prototype);
CollegeNamesDB.prototype.constructor = CollegeNamesDB;


var staticHosts = [
{
	includes:'Law',
	mainHost:'neu.edu',
	title:'Northeastern University School of Law',
	host:'neu.edu/law'
},
{
	includes:'CPS',
	mainHost:'neu.edu',
	title:'Northeastern University College of Professional Studies',
	host:'neu.edu/cps'
}]

CollegeNamesDB.prototype.getStaticHost = function(mainHost,termString) {
	
	for (var i = 0; i < staticHosts.length; i++) {
		var staticHost = staticHosts[i];
		if (staticHost.mainHost==mainHost && _(termString).includes(staticHost.includes)) {
			return {
				host:staticHost.host,
				text:termString.replace(staticHost.includes,'').replace(/\s+/gi,' ').trim()
			};
		};
	}
	return null;
};


CollegeNamesDB.prototype.getStaticValues = function(lookupValues,config) {
	var retVal = [];
	staticHosts.forEach(function (staticHost) {
		
		if (lookupValues.host && staticHost.host === lookupValues.host) {
			retVal.push({
				host:staticHost.host,
				title:staticHost.title
			})
		}
		else if (lookupValues.url && staticHost.url == lookupValues.url) {
			retVal.push({
				host:staticHost.host,
				title:staticHost.title
			})
		}
		else if (!lookupValues.url && !lookupValues.host) {
			retVal.push({
				host:staticHost.host,
				title:staticHost.title
			})
		}


	}.bind(this))
	return retVal;
};




CollegeNamesDB.prototype.isValidLookupValues = function(lookupValues) {
	return true;
};


// //no callback, could easily add one
// CollegeNamesDB.prototype.addToDB= function (homepage,title) {

//   //add to db if not already in db
//   this.find({homepage:homepage},{
// 	 	shouldBeOnlyOne:true,
// 	 	sanatize:false
// 	 },function (err,doc) {

//   	if (doc) {
//   		console.log('Warning: not inserting',homepage,'because it already exists');
//   		return;
//   	}

//   	this.db.insert({
//   		homepage:homepage,
//   		title:title
//   	});

//   }.bind(this));
// }






CollegeNamesDB.prototype.tests = function() {
	var a = this.getStaticHost('neu.edu','Law')
	console.log(a)

};





CollegeNamesDB.prototype.CollegeNamesDB=CollegeNamesDB;
module.exports = new CollegeNamesDB()


if (require.main === module) {
	module.exports.tests();
}