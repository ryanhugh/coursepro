'use strict';
var URI = require('URIjs');
var domutils = require('domutils');
var moment = require('moment');
var he = require('he');
var changeCase = require('change-case');
var _ = require('lodash');

var BaseParser = require('./BaseParser').BaseParser;
var ellucianSectionParser = require('./EllucianSectionParser');

var timeZero = moment('0','h');


//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible
function EllucianClassParser () {
	BaseParser.constructor.call(this);

	this.requiredAttrs = [];

}


//prototype constructor
EllucianClassParser.prototype = Object.create(BaseParser.prototype);
EllucianClassParser.prototype.constructor = EllucianClassParser;


EllucianClassParser.prototype.supportsPage = function (url,html) {
	return url.indexOf('bwckctlg.p_disp_listcrse')>-1;
}

//format is min from midnight, 0 = sunday, 6= saterday
//	8:00 am - 9:05 am	MWR -> {0:[{start:248309,end:390987}],1:...}
EllucianClassParser.prototype.parseTimeStamps = function(times,days) {
	if (times.toLowerCase()=='tba' || days=='&nbsp;') {
		return;
	}

	if ((times.match(/m|-/g) || []).length!=3) {
		console.log('ERROR: multiple times in times',times,days);
		return false;
	};

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

		var timesMatch = times.match(/(.*?) - (.*?)$/i)
		
		var start = moment(timesMatch[1],"hh:mm a").diff(timeZero,'seconds');
		var end = moment(timesMatch[2],"hh:mm a").diff(timeZero,'seconds');

		retVal[dayIndex] = [{
			start:start,
			end:end
		}];
	};
	return retVal;
};










EllucianClassParser.prototype.parseClassData = function(pageData,element) {

	var depData = {
		
	};


	//find the url
	domutils.findAll(function (element) {
		if (!element.attribs.href) {
			return;
		}

		var urlParsed = new URI(he.decode(element.attribs.href));

		//add hostname + port if path is relative
		if (urlParsed.is('relative')) {
			urlParsed = urlParsed.absoluteTo(pageData.getUrlStart()).toString()
		}

		if (ellucianSectionParser.supportsPage(urlParsed.toString())){
			depData.url = urlParsed.toString();
		}
	}.bind(this),element.children);

	if (!depData.url) {
		console.log('warning, no url found',pageData.dbData.url)
		return;
	};



	//find the next row
	var classDetails=element.next;
	while (classDetails.type!='tag') {
		classDetails=classDetails.next;
	}

	//find the table in this section
	var tables = domutils.getElementsByTagName('table',classDetails);
	if (tables.length===0) {
		console.log('warning, 0 tables found',pageData.dbData.url);
		pageData.addDep(depData);
		return;
	}


	if (tables.length>1) {
		console.trace('>1 table in page?');
		return
	}

	depData.meetings=[]


	var tableData = this.parseTable(tables[0]);

	if (tableData._rowCount<1) {
		console.trace('ERROR, no rows found',tableData)
		return;
	};

	for (var i = 0; i < tableData._rowCount; i++) {

		depData.meetings.push({});
		var index= depData.meetings.length-1;

	
		//if is a single day class (exams, and some classes that happen like 2x a month specify specific dates)
		var splitTimeString = tableData['date range'][i].split('-');
		var startDate = moment(splitTimeString[0].trim(),'MMM D,YYYY');
		var endDate = moment(splitTimeString[1].trim(),'MMM D,YYYY');

		if (!startDate.isValid() || !endDate.isValid()) {
			console.log('ERROR: one of parsed dates is not valid',splitTimeString,pageData.dbData,url);
		};

		//add the dates if they are valid
		//store as days since epoch 1970
		if (startDate.isValid()) {
			depData.meetings[index].startDate = startDate.diff(0,'day');
		}
		
		if (endDate.isValid()) {
			depData.meetings[index].endDate = endDate.diff(0,'day');
		}



		//parse the professors
		var prof = tableData['instructors'][i]

		//replace double spaces with a single space,trim, and remove the (p) at the end
		prof = prof.replace(/\s+/g,' ').trim().replace(/\(P\)$/gi,'').trim();

		if (prof.length<3) {
			console.log('ERROR: empty/short prof name??',prof,tableData)
		}
		if (prof.toLowerCase()=='tba') {
			prof = "TBA";
		}
		else {
			prof=changeCase.titleCase(prof);
		}

		depData.meetings[index].prof = prof;




		//start time and end time of class each day
		var times = this.parseTimeStamps(tableData['time'][i],tableData['days'][i]);

		//parse and add the times
		if (times) {
			depData.meetings[index].times=times;
		}



	};

	pageData.addDep(depData);
};

//parsing the htmls

EllucianClassParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	};

	
	if (element.name =='a' && element.attribs.href && element.parent.attribs.class=='ddtitle' && element.parent.attribs.scope=='colgroup'){
		this.parseClassData(pageData,element.parent.parent);
		
	}
};




//meta data and email data


EllucianClassParser.prototype.getMetadata = function(pageData) {

	var totalSeats = 0;
	pageData.deps.forEach(function (depData) {
		totalSeats+=parseInt(depData.dbData.seatsRemaining)
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
	};

	if (!newData.deps || !oldData.deps) {
		console.log('Warning: no deps??',pageData.dbData.url)
		return;
	};

	if (newData.deps.length>oldData.deps.length) {
		var newSectionCount = newData.deps.length-oldData.deps.length;
		return {
			title:newSectionCount + ' new section'+this.getOptionallyPlural(newSectionCount)+' of '+newData.deps[0].name +' was added!'
		}
	};
};


















if (require.main === module) {
	new EllucianClassParser().tests();
}

EllucianClassParser.prototype.EllucianClassParser=EllucianClassParser;

module.exports = new EllucianClassParser();
