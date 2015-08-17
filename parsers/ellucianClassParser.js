'use strict';
var URI = require('URIjs');
var domutils = require('domutils');
var moment = require('moment');
var he = require('he');
var toTitleCase = require('to-title-case');
var _ = require('lodash');

var classDB = require('../databases/classesDB.js')
var sectionDB = require('../databases/sectionsDB');
var EllucianBaseParser = require('./ellucianBaseParser').EllucianBaseParser;
var ellucianSectionParser = require('./ellucianSectionParser');

var timeZero = moment('0','h');


//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible
function EllucianClassParser () {
	EllucianBaseParser.prototype.constructor.apply(this,arguments);

	this.requiredAttrs = [];

	this.name = 'EllucianClassParser';

	//name and deps are optional, but if there is no deps there is nowhere to parse name...
}


//prototype constructor
EllucianClassParser.prototype = Object.create(EllucianBaseParser.prototype);
EllucianClassParser.prototype.constructor = EllucianClassParser;


EllucianClassParser.prototype.supportsPage = function (url) {
	return url.indexOf('bwckctlg.p_disp_listcrse')>-1;
};


EllucianClassParser.prototype.getDependancyDatabase = function(pageData) {
	return sectionDB;
};

EllucianClassParser.prototype.getDatabase = function(pageData) {
	return classDB;
};




//format is min from midnight, 0 = sunday, 6= saterday
//	8:00 am - 9:05 am	MWR -> {0:[{start:248309,end:390987}],1:...}
EllucianClassParser.prototype.parseTimeStamps = function(times,days) {
	if (times.toLowerCase()=='tba' || days=='&nbsp;') {
		return;
	}

	if ((times.match(/m|-/g) || []).length!=3) {
		console.log('ERROR: multiple times in times',times,days);
		return false;
	}

	var retVal={};


	var dayLetterToIndex = {
		'U':0,
		'M':1,
		"T":2,
		"W":3,
		'R':4,
		'F':5,
		'S':6
	};

	for (var i = 0; i < days.length; i++) {
		var dayIndex = dayLetterToIndex[days[i]];
		if (dayIndex===undefined) {
			console.log('ERROR: unknown letter ',days,' !!!');
			return;
		}

		var timesMatch = times.match(/(.*?) - (.*?)$/i);
		
		var start = moment(timesMatch[1],"hh:mm a").diff(timeZero,'seconds');
		var end = moment(timesMatch[2],"hh:mm a").diff(timeZero,'seconds');

		retVal[dayIndex] = [{
			start:start,
			end:end
		}];
	}
	return retVal;
};










EllucianClassParser.prototype.parseClassData = function(pageData,element) {
  console.log('parsing a class');

	//if different name than this class, save to new class
	var dbAltEntry = null;


	var sectionStartingData = {};


	//find the url
	domutils.findAll(function (element) {
		if (!element.attribs.href) {
			return;
		}

		var urlParsed = new URI(he.decode(element.attribs.href));

		//add hostname + port if path is relative
		if (urlParsed.is('relative')) {
			urlParsed = urlParsed.absoluteTo(pageData.getUrlStart()).toString();
		}

		if (ellucianSectionParser.supportsPage(urlParsed.toString())){
			sectionStartingData.url = urlParsed.toString();
		}

		//also parse the name from the link
		var value = domutils.getText(element);

		var match = value.match(/(.+?)\s-\s/i);
		if (!match || match.length<2) {
			console.log('could not find title!',match,element,value);
			return;
		}


		var className = toTitleCase(match[1]);

		//name was already set to something different, make another db entry for this class
		if (pageData.parsingData.name && className!=pageData.parsingData.name) {
			console.log('creating another class from a class!');
			
			
			//search for an existing dep with the matching classname, etc
			for (var i=0;i<pageData.deps.length;i++) {
			  
			  //we are only looking for classes here
			  if (pageData.deps[i].parser!=this) {
			    continue;
			  }
			  
			  if (pageData.deps[i].dbData.name == className && pageData.deps[i].dbData.updatedByParent) {
            console.log('re using existing dep!',pageData.deps.length);
  		      dbAltEntry = pageData.deps[i];
			  }
			}
	
	    //entry
			if (!dbAltEntry) {
			  console.log('creating a new dep entry',pageData.deps.length);
  
  			dbAltEntry = pageData.addDep({
  				name:className,
  				updatedByParent:true
  			});
			  
			}
			
			//could not create a dep with this data.. uh oh
			if (!dbAltEntry) {
			  return;
			}
			
			dbAltEntry.setParser(this);
		}
		else {
		  console.log('adding to main!');
			pageData.parsingData.name = className;
			pageData.setData('name',className);
		}

	}.bind(this),element.children);

	if (!sectionStartingData.url) {
		console.log('warning, no url found',pageData.dbData.url);
		return;
	}



	//find the next row
	var classDetails=element.next;
	while (classDetails.type!='tag') {
		classDetails=classDetails.next;
	}

	//find the table in this section
	var tables = domutils.getElementsByTagName('table',classDetails);
	if (tables.length!==1) {
		console.log('warning, '+tables.length+' meetings tables found',pageData.dbData.url);
	}

	if (tables.length>0) {
		sectionStartingData.meetings=[];

		var tableData = this.parseTable(tables[0]);

		if (tableData._rowCount<1 || !tableData.daterange || !tableData.where || !tableData.instructors || !tableData.time || !tableData.days) {
			console.log('ERROR, invalid table in class parser',tableData,pageData.dbData.url);
			return;
		}

		for (var i = 0; i < tableData._rowCount; i++) {

			sectionStartingData.meetings.push({});
			var index= sectionStartingData.meetings.length-1;


		
			//if is a single day class (exams, and some classes that happen like 2x a month specify specific dates)
			var splitTimeString = tableData.daterange[i].split('-');
			var startDate = moment(splitTimeString[0].trim(),'MMM D,YYYY');
			var endDate = moment(splitTimeString[1].trim(),'MMM D,YYYY');

			if (!startDate.isValid() || !endDate.isValid()) {
				console.log('ERROR: one of parsed dates is not valid',splitTimeString,pageData.dbData.url);
			}

			//add the dates if they are valid
			//store as days since epoch 1970
			if (startDate.isValid()) {
				sectionStartingData.meetings[index].startDate = startDate.diff(0,'day');
			}
			
			if (endDate.isValid()) {
				sectionStartingData.meetings[index].endDate = endDate.diff(0,'day');
			}

			//parse the professors
			var profs = tableData.instructors[i].split(',');

			profs.forEach(function (prof) {
				
				//replace double spaces with a single space,trim, and remove the (p) at the end
				prof = prof.replace(/\s+/g,' ').trim().replace(/\(P\)$/gi,'').trim();

				if (prof.length<3) {
					console.log('warning: empty/short prof name??',prof,tableData);
				}
				if (prof.toLowerCase()=='tba') {
					prof = "TBA";
				}
				else {
					prof=toTitleCase(prof);
				}

				if (!sectionStartingData.meetings[index].profs) {
					sectionStartingData.meetings[index].profs = [prof];
				}
				else {
					sectionStartingData.meetings[index].profs.push(prof);
				}
			}.bind(this));

			//parse the location
			sectionStartingData.meetings[index].where = toTitleCase(tableData.where[i]);

			//start time and end time of class each day
			var times = this.parseTimeStamps(tableData.time[i],tableData.days[i]);

			//parse and add the times
			if (times) {
				sectionStartingData.meetings[index].times=times;
			}
		}
	}
	

	//add data about the class
	if (pageData.parsingData.termId) {
		sectionStartingData.termId = pageData.parsingData.termId;
	}

	if (pageData.parsingData.subject) {
		sectionStartingData.subject = pageData.parsingData.subject;
	}
	if (pageData.parsingData.classId) {
		sectionStartingData.classId = pageData.parsingData.classId;
	}


  console.log('adding dep ',dbAltEntry,' and section',sectionStartingData);
  var sectionPageData;
	if (dbAltEntry) {
		console.log('adding section dep to class dep!!!');
		sectionPageData = dbAltEntry.addDep(sectionStartingData);
	}
	else {
		sectionPageData = pageData.addDep(sectionStartingData);
	}
	sectionPageData.setParser(ellucianSectionParser);

};



EllucianClassParser.prototype.onBeginParsing = function(pageData) {
	

	//parse the term from the url
	var query = new URI(pageData.dbData.url).query(true);

	if (!query.term_in) {
		console.log('could not find term_in id ellucian class parser!',query,pageData.dbData.url);
	}
	else {
		pageData.parsingData.termId = query.term_in;
		pageData.setData('termId',query.term_in);
	}

	if (!query.subj_in) {
		console.log('could not find subj_in id ellucian class parser!',query,pageData.dbData.url);
	}
	else {
		pageData.parsingData.subject = query.subj_in;
		pageData.setData('subject',query.subj_in);
	}

	if (!query.crse_in) {
		console.log('could not find crse_in id ellucian class parser!',query,pageData.dbData.url);
	}
	else {
		pageData.parsingData.classId = query.crse_in;
		pageData.setData('classId',query.crse_in);
	}
};




//parsing the htmls
EllucianClassParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	}

	
	if (element.name =='a' && element.attribs.href && element.parent.attribs.class=='ddtitle' && element.parent.attribs.scope=='colgroup'){
		this.parseClassData(pageData,element.parent.parent);
		
	}
};




//meta data and email data


EllucianClassParser.prototype.getMetadata = function(pageData) {

	var totalSeats = 0;
	pageData.deps.forEach(function (depData) {
		totalSeats+=parseInt(depData.dbData.seatsRemaining);
	});


	return {
		clientString:totalSeats + ' open seats found across '+ pageData.deps.length + ' section'+this.getOptionallyPlural(pageData.deps.length)+' of '+pageData.deps[0].dbData.name+' !'
	};
};




EllucianClassParser.prototype.getEmailData = function(pageData) {
	var newData = pageData.dbData;
	var oldData = pageData.originalData.dbData;
	if (!oldData) {
		return null;
	}

	if (!newData.deps || !oldData.deps) {
		console.log('Warning: no deps??',pageData.dbData.url);
		return;
	}

	if (newData.deps.length>oldData.deps.length) {
		var newSectionCount = newData.deps.length-oldData.deps.length;
		return {
			title:newSectionCount + ' new section'+this.getOptionallyPlural(newSectionCount)+' of '+newData.deps[0].name +' was added!'
		};
	}
};

















EllucianClassParser.prototype.EllucianClassParser=EllucianClassParser;

module.exports = new EllucianClassParser();



if (require.main === module) {
	module.exports.tests();
}
