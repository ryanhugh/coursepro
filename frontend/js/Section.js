'use strict';

function Section() {


}


Section.prototype.create = function () {

};


Section.prototype.download = function () {
	request({
		url: '/listSections',
		type: 'POST',
		body: {
			host: this.host,
			termId: this.termId,
			subject: this.subject,
			classId: this.classId,
		}
		resultsQuery: {
			crn: this.crn
		}
	}, function (err, body) {

	}.bind(this))
}


module.exports = Section;