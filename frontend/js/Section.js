'use strict';
var request = require('./request')
var macros = require('./macros')

function Section(config) {
	if (!config._id && !(config.host && config.termId && config.subject && config.classId && config.crn)) {
		console.log('ERROR section needs host, termId, subject, classId, crn or _id', config)
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

	//copy over all given attrs
	for (var attrName in config) {
		if (this[attrName] !== undefined && this[attrName] !== config[attrName]) {
			console.log('WARNING overriding data with config', attrName, this, config)
		}
		this[attrName] = config[attrName]
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

	this.dataStatus = macros.DATASTATUS_LOADING;
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
			console.log("ERROR in list sections", err)
			this.dataStatus = macros.DATASTATUS_FAIL;
			return callback(err);
		}
		this.dataStatus = macros.DATASTATUS_DONE;

		if (sections.length > 1) {
			console.log("ERROR have more than 1 section??");
		}

		var serverData = sections[0];


		//safe to copy all attrs?
		for (var attrName in serverData) {
			if (this[attrName] && this[attrName] !== serverData[attrName]) {
				console.log("ERROR server returned data that was not equal to data here??", this[attrName], serverData[attrName], this, serverData)
			}

			this[attrName] = serverData[attrName]
		}



		callback()

	}.bind(this))
}


Section.prototype.compareTo = function (other) {

	if (!this.meetings && !other.meetings) {
		return 0;
	}
	if (!this.meetings || this.meetings.length === 0) {
		return 1;
	}
	if (!other.meetings || other.meetings.length === 0) {
		return -1;
	}

	if (this.meetings[0].groupedTimes.length === 0) {
		return 1;
	}
	if (other.meetings[0].groupedTimes.length === 0) {
		return -1;
	}
	if (this.meetings[0].groupedTimes[0].times.length === 0) {
		return 1;
	}
	if (other.meetings[0].groupedTimes[0].times.length === 0) {
		return -1;
	}
	if (this.meetings[0].groupedTimes[0].times[0].start > other.meetings[0].groupedTimes[0].times[0].start) {
		return 1;
	}
	else if (this.meetings[0].groupedTimes[0].times[0].start < other.meetings[0].groupedTimes[0].times[0].start) {
		return -1;
	}
	else {
		return 0;
	}
};



module.exports = Section;