'use strict';
var request = require('./request')
var macros = require('./macros')

function Section(config) {
	if (!config._id && !(config.host && config.termId && config.subject && config.classId && config.crn)) {
		console.log('ERROR section needs host, termId, subject, classId, crn or _id',config)
	};



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
}


Section.create = function (serverData) {
	var aSection = new Section(serverData);
	if (aSection.dataStatus === undefined) {
		console.log('ERROR failed to create new class with data', serverData)
		return null;
	}
	return aSection;
};


Section.prototype.download = function (callback) {
	if (!callback) {
		callback = function () {}
	}

	this.dataStatus =  macros.DATASTATUS_LOADING;
	request({
		url: '/listSections',
		type: 'POST',
		body: {
			host: this.host,
			termId: this.termId,
			subject: this.subject,
			classId: this.classId,
		},
		resultsQuery: {
			crn: this.crn
		}
	}, function (err, sections) {
		if (err) {
			console.log("ERROR in list sections",err)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(err);
		}
		this.dataStatus = macros.DATASTATUS_DONE;

		if (sections.length>1) {
			console.log("ERROR have more than 1 section??");
		}

		var serverData = sections[0];


		//safe to copy all attrs?
		for (var attrName in serverData) {
			if (this[attrName] && this[attrName] !== serverData[attrName]) {
				console.log("ERROR server returned data that was not equal to data here??",this[attrName],serverData[attrName],this,serverData)
			}

			this[attrName] = serverData[attrName]
		}



		callback()

	}.bind(this))
}


module.exports = Section;