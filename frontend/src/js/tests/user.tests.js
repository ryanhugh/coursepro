'use strict';

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
			_id: '575102d1b462e991061ca594'
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
			_id: '56f21f93ea47044a05691b3e'
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


	it('should upgrade or something', function() {
		localStorage.dbData = '{"lists":{"saved":{"classes":["56f22470ea47044a056a3dd8"],"sections":["56f2246eea47044a056a3d7e"]}},"vars":{"lastSelectedCollege":"neu.edu","lastSelectedTerm":"201710"}}';

		user.loadFromLocalStorage();


		var localData = JSON.parse(localStorage.dbData);
		expect(localData.version).toBe(user.constructor.DBDATA_VERSION);
		expect(localData.lists.saved).toBe(undefined);
		expect(localData.vars.lastSelectedCollege).toBe('neu.edu');
	});


});