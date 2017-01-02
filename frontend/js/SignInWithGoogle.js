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

var macros = require('./macros')
var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')

var user = require('./data/user')


function SignInWithGoogle() {
	BaseDirective.prototype.constructor.apply(this, arguments);
}

macros.inherent(BaseDirective, SignInWithGoogle)

SignInWithGoogle.$inject = []

SignInWithGoogle.fnName = 'SignInWithGoogle'

SignInWithGoogle.prototype.link = function (scope, element, attrs) {

	var id = Math.random() + '' + Math.random()

	element[0].id = id;

	gapi.signin2.render(id, {
		onsuccess: function (googleUser) {
			user.signedInWithGoogle(null, googleUser.getAuthResponse().id_token)
		}.bind(this),
		onfailure: function (err) {
			elog('Error signing in with google', err)
			user.signedInWithGoogle(err)
		}.bind(this)
	});
}


SignInWithGoogle.prototype.SignInWithGoogle = SignInWithGoogle;
module.exports = SignInWithGoogle;
directiveMgr.addDirective(SignInWithGoogle)
