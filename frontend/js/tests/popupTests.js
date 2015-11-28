'use strict';

var popup = require('../popup')
var assert = require('assert')

function PopupTests () {
	
	this.input = [
	    {
	        "startDate": 16811,
	        "endDate": 16911,
	        "profs": [
	            "Leena Razzaq"
	        ],
	        "where": "West Village H 212",
	        "times": {
	            "2": [
	                {
	                    "start": 62100,
	                    "end": 68100
	                }
	            ]
	        },
	        "groupedTimes": [
	            {
	                "times": [
	                    {
	                        "start": 62100,
	                        "end": 68100
	                    }
	                ],
	                "days": [
	                    "2"
	                ]
	            }
	        ]
	    }
	]


	this.input2 = {
	    "startDate": 16687,
	    "endDate": 16778,
	    "profs": [
	        "Ravi Sundaram"
	    ],
	    "where": "Churchill Hall 103",
	    "times": {
	        "1": [
	            {
	                "start": 42300,
	                "end": 48300
	            }
	        ],
	        "4": [
	            {
	                "start": 42300,
	                "end": 48300
	            }
	        ]
	    },
	    "groupedTimes": []
	}


	this.input3 =[ {
	    "startDate": 16687,
	    "endDate": 16687,
	    "profs": [
	        "Ravi Sundaram"
	    ],
	    "where": "Churchill Hall 103",
	    "times": {
	        "1": [
	            {
	                "start": 42300,
	                "end": 48300
	            }
	        ],
	        "4": [
	            {
	                "start": 42300,
	                "end": 48300
	            }
	        ]
	    },
	    "groupedTimes": []
	}]



}


PopupTests.prototype.testcreateTimeStrings = function() {

	var input = _.cloneDeep(this.input)
	popup.createTimeStrings(input)

	assert.equal("Tuesday",input[0].dayString)
	assert.equal("5:15 - 6:55 pm",input[0].timeString)
};

PopupTests.prototype.testcalculateHoursPerWeek = function() {
	
	var input = _.cloneDeep(this.input)
	popup.calculateHoursPerWeek(input)
	assert.equal(1.7,input[0].hoursPerWeek)
};



PopupTests.prototype.testaddtogroupedtiems = function() {

	var input = _.cloneDeep(this.input2)
	popup.addTimestoGroupedTimes(input,"1")

	assert.deepEqual(input.groupedTimes[0].times,input.times[1])
	assert.deepEqual(input.groupedTimes[0].days,["1"])
};

PopupTests.prototype.testcalculateExams = function() {
	

	var input = _.cloneDeep(this.input2)
	popup.calculateExams([input]);
	assert.equal(input.isExam,false);


	input = _.cloneDeep(this.input3)
	popup.calculateExams(input);
	assert.equal(input[0].isExam,true)
};


PopupTests.prototype.go = function() {
	this.testcreateTimeStrings()
	this.testcalculateHoursPerWeek()
	this.testaddtogroupedtiems()
	this.testcalculateExams()

	console.log('done')
};




PopupTests.prototype.PopupTests=PopupTests;
module.exports = new PopupTests();