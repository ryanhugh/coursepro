var fs = require('fs')
var prereqClassUids = require('../prereqClassUids')


it('can substitute one line', function () {

	var keyToRows = {
		'neu.edu201770MATH2500': [{
			subject: 'MATH',
			classUid: '2500_34343'
		}]
	}

	var prereqs = {
		type: 'or',
		values: [
			'dd', {
				classId: '2500',
				subject: 'MATH'
			}
		]
	}

	var output = prereqClassUids.updatePrereqs(prereqs, 'neu.edu', '201770', keyToRows)

	expect(output).toEqual({
		type: 'or',
		values: ['dd', {
			subject: 'MATH',
			classUid: '2500_34343'
		}]
	})
});



it('can replace a class with multiple matches with an "or"', function () {

	var prereqs = {
		type: 'or',
		values: [
			'dd', {
				classId: '2500',
				subject: 'MATH'
			}
		]
	}

	var keyToRows = {
		'neu.edu201770MATH2500': [{
			subject: 'MATH',
			classUid: '2500_77777'
		}, {
			subject: 'MATH',
			classUid: '2500_1222121'
		}]
	}

	var output = prereqClassUids.updatePrereqs(prereqs, 'neu.edu', '201770', keyToRows)


	expect(output).toEqual({
		"type": "or",
		"values": ["dd", {
			"type": "or",
			"values": [{
				"subject": "MATH",
				"classUid": "2500_77777"
			}, {
				"subject": "MATH",
				"classUid": "2500_1222121"
			}]
		}]
	})
});


it('go should work', function (done) {


	var baseQuery = {
		"classId": "061",
		"host": "swarthmore.edu",
		"termId": "201602",
		"subject": "STAT"
	}

	prereqClassUids.go(baseQuery, function (err, updatedClasses) {
		expect(updatedClasses.length).toBe(1)
		expect(updatedClasses[0].prereqs.values[0].classUid).toBe('023_1049977931')
		expect(updatedClasses[0].prereqs.values[0].classId).toBe(undefined)
		expect(updatedClasses[0].prereqs.values.length).toBe(3)
		done()
	}.bind(this))
});
