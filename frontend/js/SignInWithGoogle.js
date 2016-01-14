'use strict';

var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')

function SignInWithGoogle() {

	function SignInWithGoogleInner() {
		this.scope = null;
	}

	SignInWithGoogleInner.scope = true;


	SignInWithGoogleInner.prototype.link = function (scope, element, attrs) {
		this.scope = scope;

		var id = Math.random() + '' + Math.random()

		element[0].id = id;

		gapi.signin2.render(id, {
			onsuccess: function (googleUser) {
				this.onSignIn(null,googleUser)
			}.bind(this),
			onfailure: function (err) {
				console.log('Error signing in with google',err)
				this.onSignIn(err)
			}.bind(this)
		});
	}

	SignInWithGoogleInner.prototype.onSignIn = function (err, googleUser) {
		this.scope.$emit('googleSignIn',{
			err:err,
			googleUser:googleUser
		})
	};



	var instance = new SignInWithGoogleInner();
	instance.link = instance.link.bind(instance)

	return instance;
}

SignInWithGoogle.prototype.SignInWithGoogle = SignInWithGoogle;
module.exports = SignInWithGoogle;
directiveMgr.addLink(SignInWithGoogle)