'use search';

var queue = require('queue-async');
var _ = require('lodash')

var subjectsDB = require('./databases/subjectsDB')
var classesDB = require('./databases/classesDB')
var sectionsDB = require('./databases/sectionsDB')

function Search() {

}


Search.prototype.search = function(body,callback) {

	body.value = body.value.toLowerCase()

	//strip all unneeded members, in case give more
	var lookupTerms = {
		host:body.host,
		termId:body.termId
	}

	var results = [];

	//assume that all sections are a part of the classes also being looked up
	//use this to find the class data if a section is matched
	var allClassesFound = [];

	var q = queue()

	//search classes
	q.defer(function (callback) {

		var classLookupData = {
			host:body.host,
			termId:body.termId,
			subject:body.subject
		}

		classesDB.find(classLookupData,{
			shouldBeOnlyOne:false,
			sanatize:false
		},function (err,classes) {
			if (err) {
				return callback(err);
			};
			allClassesFound = classes;


			classes.forEach(function (classData) {


				//search the classes details
				var stringToSearch = (classData.desc + classData.name +classData.classId + classData.subject)
				stringToSearch = stringToSearch.replace(/\s+/gi,'').toLowerCase();

				if (_(stringToSearch).includes(body.value)) {
					results.push(classData);
				}

			}.bind(this))
			//
			callback()
		}.bind(this));
		//
	}.bind(this))
	//

	var matchingSections = []

	//search sections
	q.defer(function (callback) {

		var sectionLookupData = {
			host:body.host,
			termId:body.termId,
			subject:body.subject
		}

		sectionsDB.find(sectionLookupData,{
			shouldBeOnlyOne:false,
			sanatize:false,
			skipValidation:true
		},function (err,sections) {
			if (err) {
				return callback(err);
			}
			sections.forEach(function (section) {
				
				//crn, profs, where
				var stringToSearch = [section.crn];
				if (section.meetings) {
					section.meetings.forEach(function (meeting) {
						stringToSearch.push(meeting.where);
						meeting.profs.forEach(function (prof) {
							stringToSearch.push(prof);
						}.bind(this));
					}.bind(this));
				};

				stringToSearch=stringToSearch.join('').replace(/\s+/gi,'').toLowerCase()

				if (_(stringToSearch).includes(body.value)) {
					//yay found it
					matchingSections.push(section);
				}
			}.bind(this))
			callback()
		}.bind(this))
	}.bind(this));
	//



	q.awaitAll(function (err) {
		if (err) {
			callback(err);
		};


		allClassesFound.forEach(function (classData) {
			matchingSections.forEach(function (section) {

				//subject compare is not requried
				if (classData.classId==section.classId && classData.subject === section.subject && _(classData.crns).includes(section.crn)) {
					if (!_(results).includes(classData)) {
						results.push(classData);
					}
				};
			}.bind(this))
		}.bind(this))


		//sanitize the output
		var retVal = [];
		results.forEach(function (classData) {
			retVal.push(classesDB.removeInternalFields(classData))
		}.bind(this))



		callback(null,retVal)
	}.bind(this))
}





Search.prototype.tests = function() {
	this.search({
		host:'neu.edu',
		termId:'201610',
		value:'cs4800',
		subject:'CS'
	},function (err,results) {
		console.log('test returnd with:',err,results);
	}.bind(this));
};



Search.prototype.Search=Search;
module.exports = new Search();

if (require.main === module) {
	module.exports.tests();

}