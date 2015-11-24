'use strict';

function Selectors () {

	this.class = {
		element: $(".selectClass"),
		value:'',
		values:[],
		setup:this.selectClass.bind(this),
		class:'classSelectContainer'
	}

	this.subject = {
		element: $(".selectSubject"),
		value:'',
		values:[],
		setup:this.selectSubject.bind(this),
		next:this.class,
		class:'subjectSelectContainer'
	}

	this.term = {
		element: $(".selectTerm"),
		value:'',
		values:[],
		setup:this.selectTerm.bind(this),
		next:this.subject,
		class:'termSelectContainer'
	}

	this.college = {
		element: $(".selectCollege"),
		value:'',
		values:[],
		setup:this.selectCollege.bind(this),
		next:this.term,
		class:'collegeSelectContainer'
	}
	
	
	//the .val() of the Select Your College!, Select Term!, option
	this.dropDownInfoId = 'null'



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
		if (dropdown.value) {
			url.push(encodeURIComponent(dropdown.value));
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

Selectors.prototype.resetDropdown = function(dropdown) {
	if (dropdown.element[0].options.length===0) {
		return;
	}
	dropdown.element.select2("destroy").removeClass('select2-offscreen')
	dropdown.element.empty()
	dropdown.element.off('select2:select');
	dropdown.element[0].value=''
}

Selectors.prototype.resetAllFutureVals = function(dropdown) {
	//find the element to reset all past
	var i =0;

	for (; i < this.selectors.length; i++) {
		if (this.selectors[i] == dropdown) {
			break;
		}
	}
	i++;

	//reset all past here
	for (; i < this.selectors.length; i++) {
		this.resetDropdown(this.selectors[i])
		this.selectors[i].element[0].value=''
		this.selectors[i].value=''
	};
}



Selectors.prototype.setupSelector = function(dropdown,selectValues,config) {
	if (config===undefined) {
		config={}
	}
	if (config.shouldOpen===undefined) {
		config.shouldOpen=true;
	}

	dropdown.value = dropdown.element.val();
	dropdown.values = selectValues;
	this.resetDropdown(dropdown);
	
	if (selectValues.length===0) {
		console.log('nothing found!')
		$("#nothingFound").show();
		return;
	}
	$("#nothingFound").hide();


	dropdown.element.select2({data:selectValues});
	dropdown.element.select2({containerCssClass: dropdown.class })

	var ids = _.map(selectValues,function (selectValue) {
		return selectValue.id;
	}.bind(this));

	if (config.shouldOpen && !search.isOpen && (!config.defaultValue || !_(ids).includes(config.defaultValue))) {
		dropdown.element.select2('open');
	}
	else {
		dropdown.value = config.defaultValue;
		dropdown.element.select2("val",config.defaultValue);
	}

	//i would use .on('change'), but when setting the default value it dosent fire the
	// change event on close. So keep track of the last element, and if
	// it is different on close, fire the callback
	dropdown.element.on("select2:select",function (event) {
		if (search.isOpen) {
			return;
		}
		var selection = dropdown.element.val();
		if (!selection) {
			return;
		}
		
		if (selection==dropdown.value) {
			console.log('not changing from ',dropdown.value,selection)
			return;
		}


	
		//ug what causes this to run?? is it when you open search when dropdown is open?
		    // dont update dropdown.value
			// reset this + all future elements
		// if (search.isOpen && !dropdown.value) {
				// run reset all and update deeplink, return;
		
		if (selection && selection!=this.dropDownInfoId) {
			dropdown.value = selection;
		}
		else {
			dropdown.value = null;
		}
		

		this.resetAllFutureVals(dropdown);
		this.updateDeeplink()
		
		
		if (!selection || selection==this.dropDownInfoId) {
			return;
		}
		


		if (search.isOpen) {
			return;
		}


		ga('send', {
			'hitType': 'pageview',
			'page': window.location.href,
			'title': 'Coursepro.io'
		});


		console.log('selected',selection)

		if (dropdown.next) {
			dropdown.next.setup()
		}
		else {
			setTimeout(function(){
				this.finish()
			}.bind(this),0);
		}

	}.bind(this))
}


Selectors.prototype.selectCollege = function(config) {
	request({
		type:'POST',
		url:'/listColleges',
		body:{}
	},function (err,body){
		if (err) {
			console.log(err);
			return;
		}

		var selectValues = [];
		body.forEach(function (college) {
			selectValues.push({
				id:college.host,
				text:college.title
			});
		}.bind(this));

		selectValues.sort(function(a, b){
			if(a.text < b.text) return -1;
			if(a.text > b.text) return 1;
			return 0;
		}.bind(this))
		
		selectValues= [{id:this.dropDownInfoId,text:'Select Your College!'}].concat(selectValues)
		
		this.setupSelector(this.college,selectValues,config);
	}.bind(this));
}
Selectors.prototype.selectTerm = function(config) {
	request({
		url:'/listTerms',
		type:'POST',
		body:{
			host:this.college.value
		}
	} ,function (err,body){
		if (err) {
			console.log(err);
			return;
		}

		var selectValues = [];
		body.forEach(function (item) {
			selectValues.push({
				text:item.text,
				id:item.termId
			})
		}.bind(this))

		selectValues.sort(function(a, b){
			if(a.id > b.id) return -1;
			if(a.id < b.id) return 1;
			return 0;
		}.bind(this))
		selectValues= [{id:this.dropDownInfoId,text:'Select Term!'}].concat(selectValues)
		this.setupSelector(this.term,selectValues,config);
	}.bind(this));
}

Selectors.prototype.selectSubject = function(config) {
	request({
		url:'/listSubjects',
		type:'POST',
		body:{
			host:this.college.value,
			termId:this.term.value
		}
	} ,function (err,body){
		if (err) {
			console.log(err);
			return;
		}

		var selectValues = [];
		body.forEach(function (item) {
			if (!item.subject || !item.text) {
				return;
			}

			selectValues.push({
				text:item.subject+' - '+item.text,
				id:item.subject
			})
		}.bind(this))

		selectValues.sort(function(a, b){
			if(a.id < b.id) return -1;
			if(a.id > b.id) return 1;
			return 0;
		}.bind(this))
		selectValues= [{id:this.dropDownInfoId,text:'Select Subject!'}].concat(selectValues)
		this.setupSelector(this.subject,selectValues,config);
	}.bind(this))
}

Selectors.prototype.selectClass = function(config) {
	request({
		url:'/listClasses',
		type:'POST',
		body:{
			host:this.college.value,
			termId:this.term.value,
			subject:this.subject.value
		}
	} ,function (err,body){
		if (err) {
			console.log(err);
			return;
		}

		var selectValues = [];
		body.forEach(function (item) {
			if (!item.classId || !item.name) {
				return;
			};
			selectValues.push({
				text:item.classId+' - '+item.name,
				id:item.classId
			})
		}.bind(this))

		selectValues.sort(function(a, b){
			if(a.id < b.id) return -1;
			if(a.id > b.id) return 1;
			return 0;
		}.bind(this))
		selectValues= [{id:this.dropDownInfoId,text:'Select Class!'}].concat(selectValues)
		this.setupSelector(this.class,selectValues,config);
	}.bind(this));
}
Selectors.prototype.getCollegeText = function() {
	if (this.college.element.data('select2')) {
		return this.college.element.select2('data')[0].text;
	}
	else {
		return ''
	}
};

Selectors.prototype.getTermText = function() {
	if (this.term.element.data('select2')) {
		return this.term.element.select2('data')[0].text;
	}
	else {
		return ''
	}
};

Selectors.prototype.getSubjectText = function() {
	if (this.subject.element.data('select2')) {
		return this.subject.element.select2('data')[0].text;
	}
	else {
		return ''
	}
};

Selectors.prototype.getClassText = function() {
	if (this.class.element.data('select2')) {
		return this.class.element.select2('data')[0].text;
	}
	else {
		return ''
	}
};


Selectors.prototype.closeAllSelectors = function () {
	this.selectors.forEach(function(selector){
		if (selector.element.data('select2')) {
			selector.value =selector.element.val();
			selector.element.select2('close');
		}
	}.bind(this))
}

Selectors.prototype.finish = function() {
	treeMgr.createTree(this.college.value,this.term.value,this.subject.value,this.class.value)
}

//
Selectors.prototype.setSelectors = function(values,doOpenNext) {
	
	//close all selectors, then open the ones told to
	this.closeAllSelectors()
	
	values.forEach(function (value,index) {


		value = value.replace(/[^a-z0-9\/\.]/gi,'')


		this.selectors[index].setup({defaultValue:value,shouldOpen:false});
		this.selectors[index].value = value

		//if at end, open next selector or create tree
		if (index == values.length-1) {
			
			//destroy all the selectors after this one
			this.selectors.slice(index+1).forEach(function(selector) {
				this.resetDropdown(selector);
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
	if (_(value.toLowerCase()).startsWith(this.subject.value.toLowerCase())) {
		value=value.slice(this.subject.value.length).trim()
	}

	for (var i = 0; i < this.class.values.length; i++) {
		var currClass = this.class.values[i];

		//yay found match, open the class
		if (currClass.id.toLowerCase()===value.toLowerCase()) {

			//open
			search.closeSearchBox();
			selectors.class.element.select2('val',value);
			selectors.class.element.trigger('select2:close')
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
			this.resetDropdown(selector);
		}.bind(this))
		
		
		this.college.setup({defaultValue:this.dropDownInfoId,shouldOpen:false});
		this.college.value = this.dropDownInfoId;
		homepage.show();
		return;
	}



	//first term is search, last is the search term
	if (values[0]=='search') {
		this.setSelectors(values.slice(1,values.length-1),false);
		search.searchFromString(values[1],values[2],values[3],values[4])
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


