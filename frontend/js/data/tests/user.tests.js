'use strict';

localStorage.clear()

var user = require('../user')
var Class = require('../Class')
var Section = require('../Section')

describe('validateEmail', function () {
	it('can pass and fail emails', function () {
		expect(user.validateEmail('bob@gmail.com')).toBe(true);
		expect(user.validateEmail('gmail.com')).toBe(false);
	});
});


describe('user', function () {


	beforeEach(function () {
		localStorage.clear()
	});

	it('add to lists works', function (done) {
		Class.create({
			"classUid": "5000_202147161",
			"host": "neu.edu",
			"termId": "201710",
			"subject": "GE",
		}).download(function (err, aClass) {
			expect(err || null).toBe(null)


			expect(user.getListIncludesClass('test', aClass)).toBe(false);

			user.addToList('test', [aClass], [], function (err) {
				expect(err || null).toBe(null)

				expect(user.getListIncludesClass('test', aClass)).toBe(true)

				var localList = JSON.parse(localStorage.dbData)
				expect(localList.lists.test.classes.length).toBe(1)
				expect(localList.lists.test.classes[0].classUid).toBe('5000_202147161')


				user.removeFromList('test', [aClass], [], function () {


					expect(user.getListIncludesClass('test', aClass)).toBe(false)

					var localList = JSON.parse(localStorage.dbData)
					expect(localList.lists.test.classes.length).toBe(0)

					done()
				}.bind(this))
			}.bind(this))
		}.bind(this))
	}.bind(this))

	it('add to lists works with section', function (done) {
		Section.create({
			"crn": "11722",
			"host": "neu.edu",
			"termId": "201610",
			"subject": "CS",
			"classUid": "2511",
		}).download(function (err, section) {
			expect(err || null).toBe(null)


			expect(user.getListIncludesSection('test', section)).toBe(false);

			user.addToList('test', [], [section], function (err) {
				expect(err || null).toBe(null)

				expect(user.getListIncludesSection('test', section)).toBe(true)

				var localList = JSON.parse(localStorage.dbData)
				expect(localList.lists.test.sections.length).toBe(1)
				expect(localList.lists.test.sections[0].classUid).toBe('2511')


				user.removeFromList('test', [], [section], function () {


					expect(user.getListIncludesSection('test', section)).toBe(false)

					var localList = JSON.parse(localStorage.dbData)
					expect(localList.lists.test.sections.length).toBe(0)

					done()
				}.bind(this))
			}.bind(this))
		}.bind(this))
	}.bind(this))


	it('should upgrade or something', function () {
		localStorage.dbData = '{"lists":{"saved":{"classes":["56f22470ea47044a056a3dd8"],"sections":["56f2246eea47044a056a3d7e"]}},"vars":{"lastSelectedCollege":"neu.edu","lastSelectedTerm":"201710"}}';

		user.loadFromLocalStorage();

		var localData = JSON.parse(localStorage.dbData);
		expect(localData.version).toBe(user.constructor.DBDATA_VERSION);
		expect(localData.lists.saved).toBe(undefined);
		expect(localData.vars.lastSelectedCollege).toBe('neu.edu');
	});


	it('the picked date should be fall 2016 when date is set to aug 2016', function (done) {

		var globalDate = Date;
		window.Date = function () {
			switch (arguments.length) {
				case 0:

					// Phantoms js does not support creating dates in the format yyyy-mm-dd
					return new globalDate('2016-08-08T04:00:00.000Z');
				case 1:
					return new globalDate(arguments[0]);
				case 2:
					return new globalDate(arguments[0], arguments[1]);
				case 3:
					return new globalDate(arguments[0], arguments[1], arguments[2]);
				case 4:
					return new globalDate(arguments[0], arguments[1], arguments[2], arguments[3]);
				case 5:
					return new globalDate(arguments[0], arguments[1], arguments[2], arguments[3],
						arguments[4]);
				case 6:
					return new globalDate(arguments[0], arguments[1], arguments[2], arguments[3],
						arguments[4], arguments[5]);
				default:
					return new globalDate(arguments[0], arguments[1], arguments[2], arguments[3],
						arguments[4], arguments[5], arguments[6]);
			}
		}

		user.setValue(macros.LAST_SELECTED_COLLEGE, 'neu.edu');
		user.guessTerm(function (err, term) {
			expect(term).toBe('201710')

			window.Date = globalDate;
			done()
		}.bind(this))
	});
});
