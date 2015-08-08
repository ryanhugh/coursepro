'use strict';
var URI = require('URIjs');
var domutils = require('domutils');
var moment = require('moment');
var he = require('he');

var timeZero = moment('0','h');

var BaseParser = require('./BaseParser').BaseParser;
var ellucianSectionParser = require('./EllucianSectionParser');



//700+ college sites use this poor interface for their registration
//good thing tho, is that it is easily scrapeable and does not require login to access seats avalible
function EllucianClassParser () {
	BaseParser.constructor.call(this);

	this.requiredAttrs = ["year"];

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
	if (days=='&nbsp;') {
		return;
	}

	if ((times.match(/m|-/g) || []).length!=3) {
		console.log('ERROR: multiple times in times',times,days);
		return false;
	};

	var retVal = {}

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

	var depData = {};


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

	//find the next row
	var classDetails=element.next;
	while (classDetails.type!='tag') {
		classDetails=classDetails.next;
	}

	//find the times
	var rows = domutils.getElementsByTagName('tr',classDetails.children);
	rows.forEach(function (element) {
		var items = domutils.getElementsByTagName('td',element.children);

		//the header row
		if (items.length==0) {
			return;
		};

		//found the row were looking for
		if (domutils.getText(items[0]).trim().toLowerCase()=='class') {
			var prof = domutils.getText(items[6]).trim();
			
			//replace double spaces with a single space
			prof = prof.replace(/\s+/g,' ');
			
			if (prof.toLowerCase()!='tba' && prof.length>2) {
				depData.prof=prof;
			};


			var times = domutils.getText(items[1]).trim().toLowerCase();
			if (times=='tba') {
				console.log('not adding tba times on ',depData.url);
			}
			else {
				var times = this.parseTimeStamps(times,domutils.getText(items[2]));
				if (times) {
					depData.times=times;
				}
				
			}
		};
	}.bind(this));

	pageData.addDep(depData);
};

//parsing the htmls

EllucianClassParser.prototype.parseElement = function(pageData,element) {
	if (element.type!='tag') {
		return;
	};

	
	if (element.name=='span' && element.attribs.class=='fieldlabeltext') {
		this.findYear(pageData,element.parent);
	}
	else if (element.name =='a' && element.attribs.href && element.parent.attribs.class=='ddtitle' && element.parent.attribs.scope=='colgroup'){
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
