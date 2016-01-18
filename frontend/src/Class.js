'use strict';
var _ = require('lodash')
var async = require('async')
var he = require('he')

var macros = require('./macros')
var request = require('./request')
var Section = require('./Section')

var BaseData = require('./BaseData')


function Class(config) {
	BaseData.prototype.constructor.apply(this, arguments);
	if (!(config.host && config.termId && config.subject && config.classId) && !config._id && !config.isString && !(config.isClass === false)) {
		elog('ERROR need (host termId, subject, classId) or _id or string to make a class', config)
		return;
	};
	if (config instanceof Class) {
		elog("TRIED to make class from instance of class");
		return;
	};


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

	//copy over all other attr given
	for (var attrName in config) {

		//dont copy over some attr
		//these are copied above
		if (_(['coreqs', 'prereqs']).includes(attrName) || config[attrName] === undefined) {
			continue;
		}
		//title and description could have HTML entities in them, like &#x2260;, which we need to convert to actuall text
		//setting the innerHTML instead of innerText will work too, but this is better
		else if (_(['desc', 'name']).includes(attrName)) {
			this[attrName] = he.decode(config[attrName])
		}
		else {
			this[attrName] = config[attrName]
		}
	}


	this.prereqs = {
		type: 'or',
		values: []
	}

	if (config.prereqs) {
		if (!config.prereqs.values || !config.prereqs.type) {
			elog("ERROR given prereqs invalid", config.prereqs)
		}
		else {
			this.prereqs.type = config.prereqs.type

			//add the prereqs to this node, and convert server data
			config.prereqs.values.forEach(function (subTree) {
				this.prereqs.values.push(this.convertServerData(subTree))
			}.bind(this))

		}
	}

	this.coreqs = {
		type: 'or',
		values: []
	}

	if (config.coreqs) {
		if (!config.coreqs.values || !config.coreqs.type) {
			elog("ERROR given coreqs invalid", config.coreqs)
		}
		else {
			this.coreqs.type = config.coreqs.type

			//add the coreqs to this node, and convert server data
			config.coreqs.values.forEach(function (subTree) {
				this.coreqs.values.push(this.convertServerData(subTree))
			}.bind(this))
		}
	}



	//loading status is done if any sign that has data
	if (config.dataStatus !== undefined) {
		this.dataStatus = config.dataStatus
	}
	else if (!this.isClass || this.prereqs.length > 0 || this.desc || this.lastUpdateTime !== undefined || this.isString) {
		this.dataStatus = macros.DATASTATUS_DONE
	}
	else {
		this.dataStatus = macros.DATASTATUS_NOTSTARTED
	}



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


	// termText: "Spring 2016" //move this to the Terms.js and make a getter ?



}



macros.inherent(BaseData, Class)

Class.prototype.requiredPath = ['host', 'termId', 'subject']
Class.prototype.optionalPath = ['classId']
Class.prototype.API_ENDPOINT = '/listClasses'


//TODO here
//abstrat away some of the checks that are the same accross fns here



Class.create = function (serverData) {
	var aClass = new Class(serverData);
	if (aClass.isClass === undefined) {
		console.log('ERROR failed to create new class with data', serverData)
		return null;
	}
	return aClass;
}

//both instances and static function download calls go though here
// Class.download = function (config, callback) {
// 	if (!(config.body.host && config.body.termId && config.body.subject) && !config.body._id) {
// 		return callback('need more data Class.download', config)
// 	};

// 	var configClone = _.cloneDeep(config);
// 	configClone.url = '/listClasses';
// 	request(configClone, callback)
// }.bind(this)



Class.prototype.convertServerData = function (data) {
	var retVal = {};

	//already processed node, just process the prereqs and coreqs
	if (data instanceof Class) {
		retVal = data;

		var newCoreqs = [];
		data.coreqs.values.forEach(function (subTree) {
			newCoreqs.push(this.convertServerData(subTree))
		}.bind(this))

		data.coreqs.values = newCoreqs



		var newPrereqs = [];
		data.prereqs.values.forEach(function (subTree) {
			newPrereqs.push(this.convertServerData(subTree))
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
				desc: data
			}
		}
		//given a branch in the prereqs
		else if (data.values && data.type) {

			//HOW DO WE KNOW TO APPEND TO PREREQS?
			data = {
				prereqs: data,
				isClass: false
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


		retVal = Class.create(data)

	}

	if (!retVal) {
		elog("ERROR creating jawn", retVal, data, retVal == data)
		return
	}

	return retVal;
}

Class.prototype.download = function (callback) {
	if (!callback) {
		callback = function () {}
	}

	//already loaded
	if (this.dataStatus === macros.DATASTATUS_DONE) {
		return callback(null, this)
	};


	if (this.dataStatus !== macros.DATASTATUS_NOTSTARTED) {
		var errorMsg = 'data status was not not started, and called class.download?'
		elog(errorMsg, this)
		return callback(errorMsg, this)
	};
	if (this.isString || !this.isClass) {
		var errorMsg = "class.download called on string or node"
		elog(errorMsg, this)
		return callback(errorMsg)
	};


	BaseData.prototype.download.call(this, {
		returnResults: true
	}, function (err, body) {
		this.dataStatus = macros.DATASTATUS_DONE; 
		if (err) {
			console.log('http error...', err);
			return callback(err)
		}

		if (body.length == 0) {
			console.log('unable to find class even though its a prereq of another class????', this)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null, this)
		};

		//setup an or tree
		if (body.length > 1) {

			//change this to a node
			this.isClass = false;

			if (this.prereqs.values.length != 0 || this.coreqs.values.length != 0) {
				console.log('ERROR already has prereqs or coreqs in download callback??', this)
				this.prereqs.values = []
				this.coreqs.values = []
			};



			body.forEach(function (classData) {
				this.prereqs.values.push(this.convertServerData(classData))
			}.bind(this))


		}

		//else just add more data to the class
		else {
			var classData = this.convertServerData(body[0])

			for (var attrName in classData) {
				this[attrName] = classData[attrName]
			}

		}
		callback(null, this)
	}.bind(this))
}


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

	//this is possible if there are (hon) and non hon classes of same subject classId
	return 0
};

// returns {
// 	obj:{host:,termid,...},
// 	str:'neu.edu/201630/CS...'
// }
Class.prototype.getPath = function () {
	var retVal = {
		obj: {},
		str: []
	}

	var path = ['host', 'termId', 'subject', 'classId']
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

//returns {_id} if has id, else returns {host, termId, subject, classId}
// Class.prototype.getIdentifer = function () {
// 	if (this._id) {
// 		return {
// 			_id: this._id
// 		}
// 	}
// 	else if (this.host && this.termId && this.subject && this.classId) {
// 		return {
// 			host: this.host,
// 			termId: this.termId,
// 			subject: this.subject,
// 			classId: this.classId
// 		}
// 	}
// 	else {
// 		console.log('ERROR cant get id dont have enough info')
// 		return null;
// 	}
// };

//is can also be called through treeMgr, which will add class count of the tree
Class.prototype.logTree = function (body) {
	if (!body.type) {
		elog('ERROR not given a tree type', body);
		return;
	}

	if (!this.isClass || this.isString) {
		elog("ERROR cant log a string or a node")
		return;
	};

	//add host, termId, subject, and classId
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

	// tried to load sections twice
	if (this.sections.length > 0) {
		console.log('ERROR already have sections??')
		return callback('already done')
	}

	if (!this.isClass || this.isString) {
		console.log('ERROR cant load sections of !class or string')
		return callback('!class or string')
	};



	if (this.dataStatus === macros.DATASTATUS_FAIL) {
		return callback('class load failed')
	};

	//need to load this class first, then can load sections
	//if already loaded this class, callback is called immediately
	this.download(function (err) {

		this.sectionsLoadingStatus = macros.DATASTATUS_LOADING;

		var q = queue();

		this.crns.forEach(function (crn) {


			var section = Section.create({
				host: this.host,
				termId: this.termId,
				subject: this.subject,
				classId: this.classId,
				crn: crn,
				classInstance: this
			})

			q.defer(function (callback) {
				section.download(callback)
			}.bind(this))

			this.sections.push(section)
		}.bind(this))

		q.awaitAll(function (err) {
			this.sectionsLoadingStatus = macros.DATASTATUS_DONE;


			//sort sections
			this.sections.sort(function (a, b) {
				return a.compareTo(b);
			}.bind(this))


			callback(err)
		}.bind(this))
	}.bind(this))
};



module.exports = Class;