'use strict';
var macros = require('./macros')
var request = require('./request')
var Node = require('./Node')


function Class(config) {
	if ((!config.host || !config.termId || !config.subject || !config.classId) && !config._id) {
		console.log('ERROR need (host termId, subject, classId) or _id to make a class')
		return;
	};

	if (config._id) {
		this._id = config._id
	}
	else {
		this.host = config.host
		this.termId = config.termId
		this.subject = config.subject
		this.classId = config.classId
	}

	Node.prototype.constructor.apply(this, arguments)


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
	// sections: [new Seciton()]
	// subject: "CS"
	// url: "https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?term_in=201630&subj_in=CS&crse_in=4800&schd_in=%25"


	// termText: "Spring 2016" //move this to the Terms.js and make a getter ?

	this.dataStatus = macros.DATASTATUS_NOTSTARTED

	//this is allways true, nodes are a different class // CHANGE THIS AKA REMOVE NODE.js
	this.isClass = true;

	this.isString = false;

}


Class.prototype = Object.create(Node.prototype);
Class.prototype.constructor = Class;


//could move these 2 to a separate file, and bring with it the require node
Class.createWithPath = function (host, termId, subject, classId) {
	var aClass = new Class({
		host: host,
		termId: termId,
		subject: subject,
		classId: classId
	})

	//failed at the check
	if (aClass.isClass === undefined) {
		return null;
	};

};


Class.prototype.download = function (callback) {
	this.dataStatus = macros.DATASTATUS_LOADING;
	request({
		url: '/listClasses',
		resultsQuery: {
			classId: this.classId
		},
		body: {
			subject: this.subject,
			host: this.host,
			termId: this.termId
		}
	}, function (err, body) {
		this.dataStatus = macros.DATASTATUS_DONE;
		if (err) {
			console.log('http error...', err);
			return callback(err)
		}

		if (body.length == 0) {
			console.log('unable to find class even though its a prereq of another class????', tree)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(null,this)
		};

		//setup an or tree
		if (body.length > 1) {

			var newTree = new Node(this.host,this.termId)

			//because we are replacing the variable (which could be the root node) need to update the pointer to root node if it is
			if (this.tree == tree) {
				this.tree = newTree;
			};

			tree.isClass = false;
			tree.prereqs = {
				type: 'or',
				values: []
			}
			tree.coreqs = {
				type: 'or',
				values: []
			}

			body.forEach(function (classData) {
				tree.prereqs.values.push(this.convertServerData(classData))
			}.bind(this))

			//load the nodes, skip tree and go right to the bottom edge of the loaded nodes
			//if we just do fetch this tree, it will hit nodes it has already loaded (in the ignoreClasses list)
			//and stop processing
			tree.prereqs.values.forEach(function (subTree) {
				this.fetchSubTrees(subTree, queue, ignoreClasses)
			}.bind(this));


		}

		//else just add more data to the class
		else {
			var classData = this.convertServerData(body[0])

			for (var attrName in classData) {
				tree[attrName] = classData[attrName]
			}

			//process this nodes values, already at bottom edge of loaded nodes
			this.fetchSubTrees(tree, queue, ignoreClasses)
		}
	}.bind(this))
}



module.exports = Class;