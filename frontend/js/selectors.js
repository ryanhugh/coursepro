'use strict';

function Selector() {
	
	//values the selector currently has (eg CS,EECE,...)
	this.values = []


	//the .val() of the Select Your College!, Select Term!, option
	this.helpId = 'help_id'

	//set in .setup, used after the callback returns
	//if element does not exist, and this is set, return this
	this.defaultValue = null
}

Selector.prototype.reset = function (){
	if (this.element[0].options.length===0) {
		return;
	}
	this.element.select2("destroy").removeClass('select2-offscreen')
	this.element.empty()
	this.element.off('select2:select');
	this.element[0].value=''
}

Selector.prototype.getExists = function () {
	if (this.element.data('select2')) {
		return true;
	}
	else {
		return false;
	}
}


Selector.prototype.close = function () {
	if (this.getExists()) {
		this.element.select2('close');
	}
}


Selector.prototype.getValue = function() {

	// check the stored value
	var value = this.defaultValue;
	if (value && value!=this.helpId) {
		return value;
	}

	//then check the element value
	if (this.getExists()) {
		value = this.element.val();
	}

	
	if (!value || value==this.helpId) {
		return null;
	}
	return value;
}

Selector.prototype.getText = function (){
	if (this.getExists()) {
		return this.element.select2('data')[0].text;
	}
	else {
		return ''
	}
}


Selector.prototype.resetAllFutureVals = function() {

	var currSelector = this;
	
	//loop through the linked list
	while (currSelector.next) {
		
		// start with the selector after this one
		// (usally this is at the end of the loop)
		currSelector = currSelector.next;
		
		currSelector.reset()
	}
}

Selector.prototype.setup = function(config) {
	if (config) {
		this.defaultValue = config.defaultValue
	};
	request( this.getRequestBody() ,function (err,selectValues){
		if (err) {
			console.log(err);
			return;
		}

		selectValues = this.processValues(selectValues);

		selectValues= [{id:this.helpId,text:this.helpText}].concat(selectValues)

		//setup the selector with this data
		this.setupSelector(selectValues,config)

	}.bind(this));
}


Selector.prototype.setupSelector = function(values,config) {
	if (config===undefined) {
		config={}
	}
	if (config.shouldOpen===undefined) {
		config.shouldOpen=true;
	}

	this.values = values;
	this.reset();
	
	// we know that it is at leat 1 because the Select Term! item
	if (values.length===1) {
		console.log('nothing found!')
		$("#nothingFound").show();
		return;
	}
	$("#nothingFound").hide();


	this.element.select2({data:values});
	this.element.select2({containerCssClass: this.class })

	var ids = _.map(values,function (selectValue) {
		return selectValue.id;
	}.bind(this));

	//open if told to open, and there is a default value and default value in list given
	if (config.shouldOpen && !(this.defaultValue && _(ids).includes(this.defaultValue))) {
		this.element.select2('open');
	}
	else {
		this.element.select2("val",this.defaultValue);
	}
	this.defaultValue = null


	//the main on select callback
	this.element.on("select2:select",function (event) {


		this.resetAllFutureVals();
		selectors.updateDeeplink()
		
		
		if (!this.getValue()) {
			return;
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
			setTimeout(function(){
				selectors.finish()
			}.bind(this),0);
		}

	}.bind(this))
}










function Class () {
	
	Selector.prototype.constructor.apply(this,arguments);

	this.class='classSelectContainer'
	this.element=$(".selectClass")
	this.helpText = 'Select Class!'
}


//prototype constructor
Class.prototype = Object.create(Selector.prototype);
Class.prototype.constructor = Class;


Class.prototype.getRequestBody = function() {
	return {
		url:'/listClasses',
		type:'POST',
		body:{
			host:selectors.college.getValue(),
			termId:selectors.term.getValue(),
			subject:selectors.subject.getValue()
		}
	}
};

//convert the server data to the input format select2 needs
Class.prototype.processValues = function(values) {
	
	var retVal = [];
	values.forEach(function (item) {
		if (!item.classId || !item.name) {
			return;
		};
		retVal.push({
			text:item.classId+' - '+item.name,
			id:item.classId
		})
	}.bind(this))

	retVal.sort(function(a, b){
		if(a.id < b.id) return -1;
		if(a.id > b.id) return 1;
		return 0;
	}.bind(this))
	return retVal;
};


var classInstance = new Class();







function Subject () {
	Selector.prototype.constructor.apply(this,arguments);

	this.element = $(".selectSubject")
	this.class ='subjectSelectContainer'
	this.next = classInstance;
	this.helpText = 'Select Subject!'
}


//prototype constructor
Subject.prototype = Object.create(Selector.prototype);
Subject.prototype.constructor = Subject;


Subject.prototype.getRequestBody = function() {
	return {
		url:'/listSubjects',
		type:'POST',
		body:{
			host:selectors.college.getValue(),
			termId:selectors.term.getValue()
		}
	}
};

Subject.prototype.processValues = function(values) {
	
	var retVal = [];
	values.forEach(function (item) {
		if (!item.subject || !item.text) {
			return;
		}

		retVal.push({
			text:item.subject+' - '+item.text,
			id:item.subject
		})
	}.bind(this))

	retVal.sort(function(a, b){
		if(a.id < b.id) return -1;
		if(a.id > b.id) return 1;
		return 0;
	}.bind(this))
	return retVal;
}


var subjectInstance = new Subject();






function Term () {
	Selector.prototype.constructor.apply(this,arguments);
	this.element= $(".selectTerm");
	this.class='termSelectContainer';
	this.next = subjectInstance;
	this.helpText = 'Select Term!'
}


//prototype constructor
Term.prototype = Object.create(Selector.prototype);
Term.prototype.constructor = Term;

Term.prototype.getRequestBody = function() {
	return {
		url:'/listTerms',
		type:'POST',
		body:{
			host:selectors.college.getValue()
		}
	}
};

Term.prototype.processValues = function(values) {

	var retVal = [];
	values.forEach(function (item) {
		retVal.push({
			text:item.text,
			id:item.termId
		})
	}.bind(this))

	retVal.sort(function(a, b){
		if(a.id > b.id) return -1;
		if(a.id < b.id) return 1;
		return 0;
	}.bind(this))
	return retVal;
};


var termInstance = new Term();






function College () {
	Selector.prototype.constructor.apply(this,arguments);

	this.element = $(".selectCollege");
	this.class ='collegeSelectContainer';
	this.next = termInstance;
	this.helpText = 'Select Your College!'
}


//prototype constructor
College.prototype = Object.create(Selector.prototype);
College.prototype.constructor = College;

College.prototype.getRequestBody = function() {
	return {
		type:'POST',
		url:'/listColleges',
		body:{}
	}
};
College.prototype.processValues = function(values) {

	var retVal = [];
	values.forEach(function (college) {
		retVal.push({
			id:college.host,
			text:college.title
		});
	}.bind(this));

	retVal.sort(function(a, b){
		if(a.text < b.text) return -1;
		if(a.text > b.text) return 1;
		return 0;
	}.bind(this))
	return retVal;
};


var collegeInstance = new College();


















function Selectors () {


	this.class = classInstance;
	this.subject = subjectInstance;
	this.term = termInstance;
	this.college = collegeInstance;

	//order of selectors
	this.selectors = [
	this.college,
	this.term,
	this.subject,
	this.class
	]
}



Selectors.prototype.updateDeeplink = function() {
	var url = []

	this.selectors.forEach(function (dropdown) {
		if (dropdown.getValue()) {
			url.push(encodeURIComponent(dropdown.getValue()));
		};
	}.bind(this))
	
	
	var hash = url.join('/')
	
	//add both trees and selectors to history
	if (history.pushState) {
		history.pushState(null, null, "#"+hash);
	}
	else {
		window.location.hash = hash
	}

};


Selectors.prototype.closeAllSelectors = function () {
	this.selectors.forEach(function(selector){
		selector.close();
	}.bind(this))
}

Selectors.prototype.finish = function() {
	treeMgr.createTree(this.college.getValue(),this.term.getValue(),this.subject.getValue(),this.class.getValue())
}

//
Selectors.prototype.setSelectors = function(values,doOpenNext) {
	
	//close all selectors, then open the ones told to
	this.closeAllSelectors()
	
	values.forEach(function (value,index) {

		//remove anything that isnt a letter, a "/" or a . 
		value = value.replace(/[^a-z0-9\/\.]/gi,'')


		this.selectors[index].setup({defaultValue:value,shouldOpen:false});

		//if at end, open next selector or create tree
		if (index == values.length-1) {
			
			//destroy all the selectors after this one
			this.selectors.slice(index+1).forEach(function(selector) {
				selector.reset()
				// this.resetDropdown(selector);
			}.bind(this))
			
			
			if (this.selectors[index].next) {
				this.selectors[index].next.setup({shouldOpen:doOpenNext})
			}
			else if (doOpenNext) {
				this.finish();
			}
		};

	}.bind(this))
	
	// show the homepage if nothing selected
	if (values.length==0) {
		homepage.show();
	}
};

//you can search for cs4800 if cs is open,
// but network connections would be required to search eece2222 when cs is open, so add that later
Selectors.prototype.searchClasses = function(value) {

	// remove subject from beginning of search, but this only works if search for same subject that is loaded
	if (_(value.toLowerCase()).startsWith(this.subject.getValue().toLowerCase())) {
		value=value.slice(this.subject.getValue().length).trim()
	}

	for (var i = 0; i < this.class.values.length; i++) {
		var currClass = this.class.values[i];

		//yay found match, open the class
		if (currClass.id.toLowerCase()===value.toLowerCase()) {

			//open
			search.closeSearchBox();
			selectors.class.element.select2('val',value);
			selectors.class.element.trigger('select2:select')
			return true;
		};
	};
	return false;
};

Selectors.prototype.updateFromHash = function() {
	var values = window.location.hash.slice(1).split('/')
	
	
	//remove empty strings
	_.pull(values,"");

	values.forEach(function (value,index) {
		values[index]= decodeURIComponent(value)
	}.bind(this))
	
	
	//if no hash, destory all dropdowns and show (but don't open) the first one
	if (values.length==0) {
		
		this.selectors.forEach(function(selector){
			selector.reset();
		}.bind(this))
		
		homepage.show();
		return;
	}



	//first term is search, last is the search term
	if (values[0]=='search') {
		this.setSelectors(values.slice(1,values.length-1),false);
		search.searchFromString(values[1],values[2],values[3],values[4])
	}
	else if (values[0] =='tests') {

		//if minified with testing
		if (window.tests) {
			test.go(values.slice(1));
		}
		else {
			console.log('not running tests')
		}
	}
	else {
		
		//only activate things if hash all values
		//this prevents back button to going to when selected a non-class dropdown
		this.setSelectors(values,true);
	}
}



Selectors.prototype.main = function() {
	if (window.location.hash.length>1) {
		this.updateFromHash();
	}
	
	
	
	//setup the back button history
	window.onpopstate = function(event) {
		this.updateFromHash();
	}.bind(this)
}


Selectors.prototype.Selectors=Selectors;
window.selectors = new Selectors();

$(function () {
	window.selectors.main();
})

