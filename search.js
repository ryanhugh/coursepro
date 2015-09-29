'use search';

var queue = require('queue-async');
var _ = require('lodash')

var subjectsDB = require('./databases/subjectsDB')
var classesDB = require('./databases/classesDB')
var sectionsDB = require('./databases/sectionsDB')

function Search() {

}



Search.prototype.searchClasses = function(text,callback) {

}


Search.prototype.search = function(body,callback) {

	body.value = body.value.toLowerCase()

	//strip all unneeded members, in case give more
	var lookupTerms = {
		host:body.host,
		termId:body.termId
	}

	var results = [];

	var q = queue()

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


			classes.forEach(function (classData) {


				//search the classes details

				//split body.value by space!!
				// console.log()
				if (_((classData.desc + classData.name +classData.classId + ' '+ classData.subject).toLowerCase()).includes(body.value)) {
					results.push(classData);
				}

				//dont search sections if the classes matched
				else {
					q.defer(function (callback) {

						var sectionLookupData = {
							host:body.host,
							termId:body.termId,
							subject:body.subject,
							classId:classData.classId
						}

						sectionsDB.find(sectionLookupData,{
							shouldBeOnlyOne:false,
							sanatize:false
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
								
								// console.log('searching',stringToSearch,stringToSearch.join(''))										

								if (_(stringToSearch.join('').toLowerCase()).includes(body.value)) {
									//yay found it
									results.push(classData);
								}
							}.bind(this))


							callback()
						}.bind(this))


					}.bind(this));
					//

				}

			}.bind(this))
			//
			callback()
		}.bind(this));
		//
	}.bind(this))
	//


	q.awaitAll(function (err) {
		if (err) {
			callback(err);
		};

		// console.log(results);
		console.log('hdsahf')
		callback(null,results)
	}.bind(this))
}





Search.prototype.tests = function() {
	console.log('h')
	this.search({
		host:'neu.edu',
		termId:'201610',
		value:'Brown',
		subject:'CS'
	},function (err,results) {
		console.log('hi--')
		console.log(err,results);
	}.bind(this));
};



Search.prototype.Search=Search;
module.exports = new Search();

if (require.main === module) {
	module.exports.tests();

}