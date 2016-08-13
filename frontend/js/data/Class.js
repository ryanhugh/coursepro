'use strict';
var _ = require('lodash')
var he = require('he')
var queue = require('d3-queue').queue;
var moment = require('moment')

var macros = require('../macros')
var request = require('../request')
var Section = require('./Section')
var RequisiteBranch = require('./RequisiteBranch')

var BaseData = require('./BaseData')




function Class(config) {
	BaseData.prototype.constructor.apply(this, arguments);


	//true, if for instance "AP placement exam, etc"
	this.isString = false;


	//turn to false to be a node in a graph
	//this can happen if a request gets back multiple classes (eg (hon) an norm)
	//and for complex nodes in prereqs (a or b) and c
	//when this is false this is only required to have a .prereqs and coreqs
	this.isClass = true;

	// A class that is listed as a prereq for another class on the site, but this class dosen't actually exist
	// Currently, missing prereqs are not even added as prereqs for classes because I can't think of any reason to list classes
	// that don't exist anywhere on the site. Could be changed in future, the fitlter is in this file. 
	// this.missing = false;

	//instances of Section()
	this.sections = []

	//loading status of the sections
	this.sectionsLoadingStatus = macros.DATASTATUS_NOTSTARTED;

	this.prereqs = {
		type: 'or',
		values: []
	}


	this.coreqs = {
		type: 'or',
		values: []
	}

	this.crns = [];
}



macros.inherent(BaseData, Class)

Class.requiredPath = ['host', 'termId', 'subject']
Class.optionalPath = ['classUid']
Class.API_ENDPOINT = '/listClasses'


//TODO here
//abstrat away some of the checks that are the same accross fns here


Class.isValidCreatingData = function (config) {
	if (config.isString || config.isClass === false) {
		return true;
	}

	// Can make a class with clasid, not recommended and not geruentted to only have 1 or 0 results

	if (config.host && config.termId && config.subject && config.classId && !config.classUid) {
		console.warn('created class with classId')
		return true;
	}

	return BaseData.isValidCreatingData.apply(this, arguments);
};




Class.prototype.convertServerRequisites = function (data) {
	var retVal = {};

	//already processed node, just process the prereqs and coreqs
	if (data instanceof BaseData) {
		retVal = data;

		var newCoreqs = [];
		data.coreqs.values.forEach(function (subTree) {
			newCoreqs.push(this.convertServerRequisites(subTree))
		}.bind(this))

		data.coreqs.values = newCoreqs



		var newPrereqs = [];
		data.prereqs.values.forEach(function (subTree) {
			newPrereqs.push(this.convertServerRequisites(subTree))
		}.bind(this))

		data.prereqs.values = newPrereqs;
	}
	//given a branch in the prereqs
	else if (data.values && data.type) {

		var newValues = [];
		data.values.forEach(function (subTree) {
			newValues.push(this.convertServerRequisites(subTree))
		}.bind(this))


		retVal = new RequisiteBranch({
			type: data.type,
			values: newValues
		});
	}

	//need to create a new Class()
	else {

		//basic string
		if ((typeof data) == 'string') {
			data = {
				isClass: true,
				isString: true,
				desc: data,

			}
		}
		// else data is a normal class that has a .subject and a .classUid


		//the leafs of the prereq trees returned from the server dosent have host or termId,
		//but it is the same as the class that returned it,
		//so copy over the values
		if (!data.host) {
			data.host = this.host
		}
		if (!data.termId) {
			data.termId = this.termId
		}


		retVal = this.constructor.create(data, false)

	}

	if (!retVal) {
		elog("ERROR creating jawn", retVal, data, retVal == data)
		return
	}

	return retVal;
}

Class.prototype.internalDownload = function (callback) {
	if (!callback) {
		callback = function () {}
	}

	if (!this.isClass || this.prereqs.length > 0 || this.desc || this.lastUpdateTime !== undefined || this.isString) {
		this.dataStatus = macros.DATASTATUS_DONE
		return callback(null, this)
	}

	if (this.dataStatus === macros.DATASTATUS_FAIL) {
		return callback(null, this)
	}

	if (this.dataStatus !== macros.DATASTATUS_NOTSTARTED) {
		var errorMsg = 'data status was not not started, and called class.download?' + this.dataStatus
		elog(errorMsg, this)
		return callback(errorMsg, this)
	}
	if (this.isString || !this.isClass) {
		var errorMsg = "class.download called on string or node"
		elog(errorMsg, this)
		return callback(errorMsg)
	}


	BaseData.prototype.internalDownload.call(this, function (err, body) {
		if (err) {
			elog('http error...', err);
			return callback(err)
		}
		callback(null, this)
	}.bind(this))
}


Class.prototype.removeMissingClasses = function (data) {
	if (data.values) {
		var retVal = [];
		data.values.forEach(function (subData) {
			if (subData.missing) {
				return;
			}
			subData = this.removeMissingClasses(subData);
			retVal.push(subData)
		}.bind(this))

		return {
			type: data.type,
			values: retVal
		};
	}
	return data;
};

// called once
Class.prototype.updateWithData = function (config) {
	if (config instanceof Class || config.updateWithData) {
		elog('wtf', config)
	}
	if (config.missing) {
		elog('hooooo')
	}


	if (config.title) {
		elog("wtf class has a name not a title");
	}

	// if (this.prereqs.values.length > 0 && config.prereqs) {
	// 	elog('yo')
	// }

	// if (this.coreqs.values.length > 0 && config.coreqs) {
	// 	elog('yo')
	// }

	//copy over all other attr given
	for (var attrName in config) {

		//dont copy over some attr
		//these are copied below and processed a bit
		if (_(['coreqs', 'prereqs', 'download']).includes(attrName) || config[attrName] === undefined) {
			continue;
		}

		else {
			this[attrName] = config[attrName]
		}
	}

	// Remove any prereqs or coreqs that are missing
	if (config.prereqs) {
		config.prereqs = this.removeMissingClasses(config.prereqs)
	}
	if (config.coreqs) {
		config.coreqs = this.removeMissingClasses(config.coreqs)
	}

	if (config.prereqs && !_.isEqual(config.prereqs, this.serverPrereqs)) {
		if (this.serverPrereqs) {
			elog('wtf already have prereqs, given prereqs', config)
		}
		else if (!config.prereqs.values || !config.prereqs.type) {
			elog('prereqs need values ad type')
		}
		else {
			this.serverPrereqs = _.cloneDeep(config.prereqs)
		}

	}

	if (config.coreqs && !_.isEqual(config.coreqs, this.serverCoreqs)) {
		if (this.serverCoreqs) {
			elog('wtf')
		}
		else if (!config.coreqs.values || !config.coreqs.type) {
			elog('coreqs need values ad type')
		}
		else {
			this.serverCoreqs = _.cloneDeep(config.coreqs)
		}
	}

	if (config.coreqs || config.prereqs) {
		this.resetRequisites();
	}
	if (config.allParents) {
		elog('no')
	}


	//name and description could have HTML entities in them, like &#x2260;, which we need to convert to actuall text
	//setting the innerHTML instead of innerText will work too, but this is better
	if (config.desc) {
		this.desc = he.decode(config.desc)
	}
	if (config.name) {
		this.name = he.decode(config.name)
	}


	if (!config.prettyUrl && config.url) {
		this.prettyUrl = config.url;
	};

	//make sections from crns if they dont exist
	if (config.crns && config.crns.length > 0 && this.sections.length == 0) {

		config.crns.forEach(function (crn) {

			var section = Section.create({
				host: this.host,
				termId: this.termId,
				subject: this.subject,
				classUid: this.classUid,
				crn: crn,
			})

			this.sections.push(section)
		}.bind(this))
	}
	else if (this.sections.length > 0 && config.crns && config.crns.length > 0 && !_.isEqual(this.crns, config.crns)) {
		elog('updateWithData called but already have sections?', this, config)
	}

};


Class.prototype.resetRequisites = function () {
	if (this.serverPrereqs) {
		this.prereqs.type = this.serverPrereqs.type
		this.prereqs.values = []

		//add the prereqs to this node, and convert server data
		this.serverPrereqs.values.forEach(function (subTree) {
			this.prereqs.values.push(this.convertServerRequisites(_.cloneDeep(subTree)))
		}.bind(this))

		this.prereqs.values.sort(function (a, b) {
			return a.compareTo(b)
		}.bind(this))
	}
	else {

		this.prereqs = {
			type: 'or',
			values: []
		}
	}

	if (this.serverCoreqs) {
		this.coreqs.type = this.serverCoreqs.type
		this.coreqs.values = []

		//add the coreqs to this node, and convert server data
		this.serverCoreqs.values.forEach(function (subTree) {
			this.coreqs.values.push(this.convertServerRequisites(_.cloneDeep(subTree)))
		}.bind(this))

		this.coreqs.values.sort(function (a, b) {
			return a.compareTo(b)
		}.bind(this))
	}
	else {

		this.coreqs = {
			type: 'or',
			values: []
		}
	}
};

Class.prototype.equals = function (other) {
	if (!this.isClass || !other.isClass) {
		// look into the git history if attempting to implement, this, started a while ago and then deleted it
		elog('dosent support comparing non classes yet')
		return false;
	}

	// both strings
	if (this.isString && other.isString) {
		return this.desc === other.desc;
	}

	// both classes
	if (!this.isString && !other.isString) {
		return BaseData.prototype.equals.call(this, other)
	}

	// one is a string other is a class
	return false;
};




//this is used for panels i think and for class list (settings)
//sort by classId, if it exists, and then subject
Class.prototype.compareTo = function (otherClass) {
	if (this.isString && otherClass.isString) {
		return 0;
	}

	if (this.isString) {
		return -1;
	}
	if (otherClass.isString) {
		return 1;
	};

	var aId = parseInt(this.classId);
	var bId = parseInt(otherClass.classId);

	if (aId > bId) {
		return 1;
	}
	else if (aId < bId) {
		return -1;
	}

	//if ids are the same, sort by subject
	else if (this.subject > otherClass.subject) {
		return 1;
	}
	else if (this.subject < otherClass.subject) {
		return -1;
	}

	else if (this.name > otherClass.name) {
		return 1;
	}
	else if (this.name < otherClass.name) {
		return -1;
	}
	else if (this.classUid > otherClass.classUid) {
		return 1;
	}
	else if (this.classUid < otherClass.classUid) {
		return -1;
	}
	return 0
};



Class.prototype.getHeighestProfCount = function () {
	var count = 0;


	this.sections.forEach(function (section) {
		if (section.profs) {
			count = Math.max(section.profs.length, count)
		};
	}.bind(this))
	return count;
};

Class.prototype.getPrettyClassId = function () {
	if (!this.classId) {
		return null;
	}

	var prettyClassId = this.classId;
	while (_(prettyClassId).startsWith('0') && prettyClassId.length > 1) {
		prettyClassId = prettyClassId.slice(1)
	}
	return prettyClassId

};

Class.prototype.getLastUpdateString = function () {
	if (this.lastUpdateTime) {
		return moment(this.lastUpdateTime).fromNow()
	}
	else {
		return null;
	}
};

//returns true if any sections have an exam, else false
Class.prototype.sectionsHaveExam = function () {
	for (var i = 0; i < this.sections.length; i++) {
		if (this.sections[i].getHasExam()) {
			return true;
		}
	}
	return false;
};



Class.prototype.loadSections = function (callback) {
	if (!callback) {
		callback = function () {}
	};
	if (this.sectionsLoadingStatus === macros.DATASTATUS_DONE) {
		return callback()
	};


	if (!this.isClass || this.isString) {
		elog('ERROR cant load sections of !class or string')
		return callback('!class or string')
	};


	if (this.dataStatus === macros.DATASTATUS_FAIL) {
		return callback('class load failed')
	};

	//need to load this class first, then can load sections
	//if already loaded this class, callback is called immediately
	this.download(function (err) {
		if (err) {
			elog("error download a class" + err)
			return callback(err)
		}

		this.sectionsLoadingStatus = macros.DATASTATUS_LOADING;

		var q = queue();

		this.sections.forEach(function (section) {

			q.defer(function (callback) {
				section.download(function (err, instance) {
					callback(err, instance, section)
				}.bind(this))
			}.bind(this))

		}.bind(this))

		q.awaitAll(function (err) {
			if (err) {
				elog('error loading a class section' + err)
				return callback(err);
			}


			this.sectionsLoadingStatus = macros.DATASTATUS_DONE;

			var hasWaitList = 0;
			this.sections.forEach(function (section) {
				hasWaitList += section.hasWaitList;
			}.bind(this))

			if (hasWaitList > this.sections.length / 2) {
				this.hasWaitList = true;
			}
			else {
				this.hasWaitList = false;
			}


			//sort sections
			this.sections.sort(function (a, b) {
				return a.compareTo(b);
			}.bind(this))


			callback(err)
		}.bind(this))
	}.bind(this))
};


module.exports = Class;
