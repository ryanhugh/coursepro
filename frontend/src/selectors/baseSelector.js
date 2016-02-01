'use strict';
var _ = require('lodash')
var request = require('../request')

function BaseSelector() {

	//values the selector currently has (eg CS,EECE,...)
	this.values = []


	//the .val() of the Select Your College!, Select Term!, option
	this.helpId = 'help_id'

	//set in .setup, used after the callback returns
	//if element does not exist, and this is set, return this
	this.defaultValue = null
}

BaseSelector.prototype.reset = function () {
	if (this.element[0].options.length === 0) {
		return;
	}
	this.element.select2("destroy").removeClass('select2-offscreen')
	this.element.empty()
	this.element.off('select2:select');
	this.element[0].value = ''
}

BaseSelector.prototype.getExists = function () {
	if (this.element.data('select2')) {
		return true;
	}
	else {
		return false;
	}
}


BaseSelector.prototype.close = function () {
	if (this.getExists()) {
		this.element.select2('close');
	}
}


BaseSelector.prototype.getValue = function () {

	// check the stored value
	var value = this.defaultValue;
	if (value && value != this.helpId) {
		return value;
	}

	//then check the element value
	if (this.getExists()) {
		value = this.element.val();
	}


	if (!value || value == this.helpId) {
		return null;
	}
	return value;
}

BaseSelector.prototype.getText = function () {
	if (this.getExists()) {
		return this.element.select2('data')[0].text;
	}
	else {
		return ''
	}
}


BaseSelector.prototype.resetAllFutureVals = function () {

	var currSelector = this;

	//loop through the linked list
	while (currSelector.next) {

		// start with the selector after this one
		// (usally this is at the end of the loop)
		currSelector = currSelector.next;

		currSelector.reset()
	}
}

BaseSelector.prototype.setup = function (config, callback) {
	if (config) {
		this.defaultValue = config.defaultValue
	};
	if (!callback) {
		callback = function () {}
	}
	request(this.getRequestBody(), function (err, selectValues) {
		if (err) {
			console.log(err);
			return;
		}

		selectValues = this.processValues(selectValues);

		selectValues = [{
			id: this.helpId,
			text: this.helpText
		}].concat(selectValues)

		//setup the selector with this data
		this.setupSelector(selectValues, config)

		callback();

	}.bind(this));
}

BaseSelector.prototype.onSelect = function() {
	
};

BaseSelector.prototype.setupSelector = function (values, config) {
	if (config === undefined) {
		config = {}
	}
	if (config.shouldOpen === undefined) {
		config.shouldOpen = true;
	}
	console.log("setup called on ",this.constructor.name);

	this.values = values;
	this.reset();

	// we know that it is at leat 1 because the Select Term! item
	if (values.length === 1) {
		console.log('nothing found!')
		$("#nothingFound").show();
		return;
	}
	$("#nothingFound").hide();


	this.element.select2({
		data: values
	});
	this.element.select2({
		containerCssClass: this.class
	})

	var ids = _.map(values, function (selectValue) {
		return selectValue.id;
	}.bind(this));

	//open if told to open, and there is a default value and default value in list given
	if (config.shouldOpen && !(this.defaultValue && _(ids).includes(this.defaultValue))) {
		this.element.select2('open');
	}
	else {
		this.element.select2("val", this.defaultValue);
	}
	this.defaultValue = null


	//the main on select callback
	this.element.on("select2:select", function (event) {


		this.resetAllFutureVals();
		// selectorsMgr.updateDeeplink()

		var newValue = this.getValue();

		if (!newValue) {
			return
		};

		if (newValue!=this.help_id) {
			//override in college and term to set user last used value		
			this.onSelect(newValue);
		}

		ga('send', {
			'hitType': 'pageview',
			'page': window.location.href,
			'title': 'Coursepro.io'
		});

		if (this.next) {
			this.next.setup()
		}
		else {
			setTimeout(function () {
				selectorsMgr.finish()
			}.bind(this), 0);
		}

	}.bind(this))
}



BaseSelector.prototype.BaseSelector = BaseSelector;
module.exports = new BaseSelector();