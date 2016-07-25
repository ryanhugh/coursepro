'use strict';
var _ = require('lodash')
var he = require('he')
var queue = require('d3-queue').queue;
var moment = require('moment')

var macros = require('./macros')
var request = require('./request')
var Section = require('./Section')

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

	//instances of Section()
	this.sections = []

	//loading status of the sections
	this.sectionsLoadingStatus = macros.DATASTATUS_NOTSTARTED;

	// graph links, both up and down
	this.upwardLinks = []
	this.downwardLinks = []

	// Determined in tree mgr to avoid having to calculate every tick
	this.allChildrenAtSameDepth = true;


	this.prereqs = {
		type: 'or',
		values: []
	}


	this.coreqs = {
		type: 'or',
		values: []
	}

	this.crns = [];

	this.allParents = []
	
	var bValue = undefined;
	// Object.defineProperty(this, 'x', {
	//   get: function() { 
	//   	return bValue; 
	//   },
	//   set: function(newValue) { 
	//   	debugger
	//   	bValue = newValue; 
	//   },
	// });

	// this.postDataProcess();


	// host: "neu.edu"
	// termId: "201630"
	// prereqs and coreqs are inhereted from node

	// _id: "5683f82c36b66840e86b3f37"
	// classId: "4800"
	// crns: Array[2]
	// desc: "Introduces the basic principles and techniques for the design, analysis, and implementation of efficient algorithms and data representations. Discusses asymptotic analysis and formal methods for establishing the correctness of algorithms. Considers divide-and-conquer algorithms, graph traversal algorithms, and optimization techniques. Introduces information theory and covers the fundamental structures for representing data. Examines flat and hierarchical representations, dynamic data representations, and data compression. Concludes with a discussion of the relationship of the topics in this course to complexity theory and the notion of the hardness of problems. Prereq. CS 1500 or CS 2510. 4.000 Lecture hours"
	// lastUpdateTime: 1451932181085
	// maxCredits: 4
	// minCredits: 4
	// name: "Algorithms and Data"

	// prettyUrl: "https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_course_detail?cat_term_in=201630&subj_code_in=CS&crse_numb_in=4800"
	// sections: [new Section()]
	// subject: "CS"
	// url: "https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201630&subj_in=CS&crse_in=4800&schd_in=%25"

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
	};

	// Can make a class with clasid, not recommended and not geruentted to only have 1 or 0 results

	if (config.host && config.termId && config.subject && config.classId && !config.classUid) {
		console.warn('created class with classId')
		return true;
	}

	return BaseData.isValidCreatingData.apply(this, arguments);
};

Class.prototype.generateIdFromPrereqs = function () {
	if (this.isClass && this._id) {
		return;
	}

	// If not a class, re create the id in case prereqs changed

	if (this.isString) {
		this._id = this.host + this.termId + this.desc
		return;
	}

	else if (this.isClass && this.dataStatus === macros.DATASTATUS_FAIL) {
		this._id = this.host + this.termId + this.subject;
		if (this.classUid) {
			this._id = this._id + this.classUid
		}
		else if (this.classId) {
			this._id = this._id + this.classId
		}
		return;
	}


	if (this.prereqs.values.length < 2) {
		elog('not enough prereqs to generate _id from!')
	}

	this.prereqs.values.sort(function (a, b) {
		return a.compareTo(b);
	}.bind(this))

	var ids = [];
	this.prereqs.values.forEach(function (subTree) {
		ids.push(subTree._id)
	}.bind(this))
	if (ids.length === 0) {
		elog('cannot make id!', this)
	}
	this._id = ids.join('')
	if (this._id.length < 3) {
		elog('couldnt make an id!', this._id, this)
	}
};



Class.prototype.convertServerRequisites = function (data) {
	var retVal = {};

	//already processed node, just process the prereqs and coreqs
	if (data.internalDownload) {
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
		//given a branch in the prereqs
		else if (data.values && data.type) {

			//HOW DO WE KNOW TO APPEND TO PREREQS?
			data = {
				prereqs: data,
				isClass: false,
			}
		}


		//the leafs of the prereq trees returned from the server dosent have host or termId,
		//but it is the same as the class that returned it,
		//so copy over the values
		if (!data.host) {
			data.host = this.host
		}
		if (!data.termId) {
			data.termId = this.termId
		};


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
	};
	if (this.isString || !this.isClass) {
		var errorMsg = "class.download called on string or node"
		elog(errorMsg, this)
		return callback(errorMsg)
	};


	BaseData.prototype.internalDownload.call(this, function (err, body) {
		if (err) {
			elog('http error...', err);
			return callback(err)
		}
		callback(null, this)
	}.bind(this))
}

// called once
Class.prototype.updateWithData = function (config) {
	if (config instanceof Class || config.updateWithData) {
		elog('wtf', config)
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

	if (config.coreqs && !_.isEqual(config.prereqs, this.serverCoreqs)) {
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
		this.allParents = config.allParents
	}


	//name and description could have HTML entities in them, like &#x2260;, which we need to convert to actuall text
	//setting the innerHTML instead of innerText will work too, but this is better
	if (config.desc) {
		this.desc = he.decode(config.desc)
	}
	if (config.name) {
		this.name = he.decode(config.name)
	}


	if (config.missing && config.classId && !config.classUid) {

		// Backend failed to find class with this id, don't bother looking again
		this.dataStatus = macros.DATASTATUS_FAIL;
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
	this.allParents = []
	if (this.serverPrereqs) {
		this.prereqs.type = this.serverPrereqs.type
		this.prereqs.values = []

		//add the prereqs to this node, and convert server data
		this.serverPrereqs.values.forEach(function (subTree) {
			if (!subTree.missing) {
				this.prereqs.values.push(this.convertServerRequisites(_.cloneDeep(subTree)))
			}

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


Class.prototype.clone = function () {
	var other = new Class();

	for (var attrName in this) {
		if (this[attrName] instanceof HTMLElement) {
			elog('cant clone a HTMLElement in class clone', this[attrName])
			continue;
		}
		else if ((typeof this[attrName]) === 'function') {
			continue;
		}
		else if (Array.isArray(this[attrName])) {
			var canClone = true;
			for (var i = 0; i < this[attrName].length; i++) {
				if (this[attrName] instanceof HTMLElement) {
					canClone = false;
					break;
				}
			}
			if (canClone) {
				other[attrName] = _.cloneDeep(this[attrName])
			}
			else {
				elog('cant clone a HTMLElement in class clone', this[attrName])
				other[attrName] = this[attrName]
			}
		}

		// Don't deepclone sections, the same Section() is used for both class instances below
		else if (attrName == 'sections') {
			continue;
		}
		other[attrName] = _.cloneDeep(this[attrName])
	}

	other.sections = [];
	this.sections.forEach(function (section) {
		other.sections.push(section);
	}.bind(this))

	return other;
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
	return 0
};




//REPLACE THIS WITH THE JAWN FROM BASEDATA
// returns {
// 	obj:{host:,termid,...},
// 	str:'neu.edu/201630/CS...'
// }
Class.prototype.getPath = function () {
	var retVal = {
		obj: {},
		str: []
	}

	var path = ['host', 'termId', 'subject', 'classUid']
	for (var i = 0; i < path.length; i++) {
		if (this[path[i]]) {
			retVal.obj[path[i]] = this[path[i]]
			retVal.str.push(path[i])
		}
		else {
			return retVal;
		}
	}
	return retVal;
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


//is can also be called through treeMgr, which will add class count of the tree
Class.prototype.logTree = function (body) {
	if (!body.type) {
		elog('ERROR not given a tree type', body);
		return;
	}

	if (!this.host || !this.termId || !this.subject || !this.classUid) {
		elog("ERROR cant log class without host, termid, subject, classUid")
		return;
	};

	//add host, termId, subject, and classUid
	body = _.merge(this.getPath().obj, body);

	request({
		url: '/log',
		body: body,
		useCache: false
	}, function (err, response) {
		if (err) {
			elog("ERROR: couldn't log tree size :(", err, response, body);
		}
	}.bind(this))
}


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
