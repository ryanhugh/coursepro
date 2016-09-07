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
