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

it('can insert a missing if cant find in db', function () {

	var keyToRows = {}

	var prereqs = {
		type: 'or',
		values: [{
			classId: '2500',
			subject: 'MATH'
		}]
	}

	var output = prereqClassUids.updatePrereqs(prereqs, 'neu.edu', '201770', keyToRows)

	expect(output).toEqual({
		type: 'or',
		values: [{
			subject: 'MATH',
			classId: '2500',
			missing: true
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

	prereqClassUids.go([baseQuery], function (err, updatedClasses) {
		expect(updatedClasses.length).toBe(1)
		expect(updatedClasses[0].prereqs.values[0].classUid).toBe('023_1049977931')
		expect(updatedClasses[0].prereqs.values[0].classId).toBe(undefined)
		expect(updatedClasses[0].prereqs.values.length).toBe(3)
		done()
	}.bind(this))
});


it('can swap coreqs', function (done) {

	var baseQuery = {
		"classUid": "017_1314190396",
		"host": "swarthmore.edu",
		"termId": "201602",
		"subject": "EDUC"
	}

	prereqClassUids.go([baseQuery], function (err, updatedClasses) {
		expect(updatedClasses.length).toBe(1)
		console.log(updatedClasses[0].coreqs);
		expect(updatedClasses[0].coreqs.values[0].classUid).toBe('016_1711862930')
		done()
	}.bind(this))


});




it('can simplify', function (done) {


	var baseQuery = {
		"classId": "031",
		"host": "swarthmore.edu",
		"termId": "201602",
		"subject": "STAT"
	}

	prereqClassUids.go([baseQuery], function (err, updatedClasses) {
		expect(updatedClasses.length).toBe(1)

		updatedClasses[0].prereqs.values.forEach(function (prereq) {
			expect(prereq.subject).not.toBe(undefined);

			expect(prereq.values).toBe(undefined)
			expect(prereq.type).toBe(undefined)

		}.bind(this))

		done()
	}.bind(this))
});
