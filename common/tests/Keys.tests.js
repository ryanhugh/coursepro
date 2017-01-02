/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

'use strict';
var Keys = require('../Keys');
var macros = require('../macros')


it('it works', function () {


	var keys = Keys.create({
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
		classUid: '4800_3484933',
		crn: '222'
	});


	expect(keys.getHash()).toBe('neu.edu/201710/CS/4800_3484933/222')

});


it('should strip off uneccesary props', function () {

	var keys = Keys.create({
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
		classUid: '4800_3484933',
		crn: '222'
	}, macros.LIST_SUBJECTS)

	expect(keys.getHash()).toBe('neu.edu/201710/CS')
	expect(keys.getHashWithEndpoint(macros.LIST_SUBJECTS)).toBe(macros.LIST_SUBJECTS + '/neu.edu/201710/CS')
});



it('should behave...', function() {

	var obj = {
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
		classUid: '4800_3484933',
		crn: '222'
	}



	var smallObj = {
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
	}

	var keys = Keys.create(obj);

	expect(keys.getObj()).toEqual(obj);

	expect(keys.getMinimumKeys()).toEqual(Keys.create({
		host:'neu.edu',
		termId:'201710'
	}))


	expect(keys.equals(Keys.create(keys.getObj())))
	expect(!keys.equals(Keys.create(smallObj)))
	expect(keys.propsEqual(obj));

});



it('containsAllProperties should work', function() {
	var obj = {
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
	}

	var keys = Keys.create(obj);

	expect(keys.containsAllProperties(['host','termId','subject']))
	expect(!keys.containsAllProperties(['host','hiii','yoooo']))
}); 

 
 it('isValid should work', function() {
 	
	var obj = {
		host: 'neu.edu',
		termId: '201710',
		subject: 'CS',
	}
	var keys = Keys.create(obj);

	expect(keys.isValid(macros.list_SECTIONS)).toBe(false)
	expect(keys.isValid(macros.LIST_SUBJECTS)).toBe(true)
	expect(keys.isValid(macros.LIST_CLASSES)).toBe(true)
	expect(keys.isValid(macros.LIST_COLLEGES)).toBe(false)



	var obj = {
		host: 'neu.edu',
		termId: '201710',
	}
	var keys = Keys.create(obj,macros.LIST_TERMS);
	expect(keys.isValid()).toBe(true)
 });
 
 it('should work with hash',function(){
 	
 	
 	var a = 'blablah'
 	var b = 'flkdsjlafjalskjfsl'
 	var c = 'hiii'
 	var keys = Keys.createWithHash({
 		host:a,
 		hash:b,
 		termId:c
 	})
 	
 	expect(keys.host).toBe(a);
 	expect(keys.hash).toBe(b);
 	expect(keys.termId).toBe(c);
 	
 	var d = 'iuiiii'
 	var e = 'fdjklsa'
 	
 	var keys = Keys.createWithHash({
 		host:a,
 		hash:b,
 		termId:c,
 		classUid:d,
 		subject:e
 	})
 	
 	expect(keys.hash).toBe(undefined)
 	expect(keys.subject).toBe(e)
 	expect(keys.classUid).toBe(d)
 	
 })