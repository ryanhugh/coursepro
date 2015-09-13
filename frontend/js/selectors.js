'use strict';


function Selectors () {

	this.college = {
		element: $(".selectCollege"),
		value:'',
		next:this.selectTerm.bind(this),
		class:'collegeSelectContainer'
	}

	this.term = {
		element: $(".selectTerm"),
		value:'',
		next:this.selectSubject.bind(this),
		class:'termSelectContainer'
	}

	this.subject = {
		element: $(".selectSubject"),
		value:'',
		next:this.selectClass.bind(this),
		class:'subjectSelectContainer'
	}
	this.class = {
		element: $(".selectClass"),
		value:'',
		next:this.finish.bind(this),
		class:'classSelectContainer'
	}


	//order of selectors and some other data about them
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
			url.push(dropdown.value);
		};
	}.bind(this))

	window.location.hash = url.join('/')
};

Selectors.prototype.resetDropdown = function(dropdown) {
	if (dropdown.element[0].options.length==0) {
		return;
	}
	dropdown.element.select2("destroy").removeClass('select2-offscreen')
	dropdown.element.empty()
	dropdown.element.off('select2:close');
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
Selectors.prototype.setupSelector = function(dropdown,selectValues) {
	
	dropdown.value = dropdown.element.val();
	this.resetDropdown(dropdown);
	
	if (selectValues.length===0) {
		console.log('nothing found!')
		$("#nothingFound").show();
		return;
	}
	$("#nothingFound").hide();


	dropdown.element.select2({data:selectValues});
	dropdown.element.select2({containerCssClass: dropdown.class })
	dropdown.element.select2('open');

	//i would use .on('change'), but when setting the default value it dosent fire the 
	// change event on close. So keep track of the last element, and if 
	// it is different on close, fire the callback
	dropdown.element.on("select2:close",function (event) {
		var selection = dropdown.element.val();
		if (!selection) {
			return;
		}
		
		if (selection==dropdown.value) {
			console.log('not chaning from ',curr,selection)
			return;
		}

		ga('send', 'event', 'category', 'action', {'type':'selector','selector': dropdown.class,'value': selection});

		dropdown.value = selection;
		this.resetAllFutureVals(dropdown);
		this.updateDeeplink()

		console.log('selected',selection)
		
		dropdown.next()

	}.bind(this))
}


Selectors.prototype.selectCollege = function() {
	request('/listColleges',function (err,body){
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
		this.setupSelector(this.college,selectValues);
	}.bind(this));
}
Selectors.prototype.selectTerm = function() {
	request({
		url:'/listTerms',
		type:'POST',
		body:JSON.stringify({
			host:this.college.value
		})
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
		this.setupSelector(this.term,selectValues);
	}.bind(this));
}

Selectors.prototype.selectSubject = function() {
	request({
		url:'/listSubjects',
		type:'POST',
		body:JSON.stringify({
			host:this.college.value,
			termId:this.term.value
		})
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
		this.setupSelector(this.subject,selectValues);
	}.bind(this))
}

Selectors.prototype.selectClass = function() {
	
	request({
		url:'/listClasses',
		type:'POST',
		body:JSON.stringify({
			host:this.college.value,
			termId:this.term.value,
			subject:this.subject.value
		})
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
		this.setupSelector(this.class,selectValues);
	}.bind(this));
}

Selectors.prototype.finish = function() {
	treeMgr.createTree(this.college.value,this.term.value,this.subject.value,this.class.value)
}

Selectors.prototype.main = function() {
	if (window.location.hash.length>1) {
		var values = window.location.hash.slice(1).split('/')
		values.forEach(function (value,index) {

			this.selectors[index].value = value
			this.selectors[index].element.select2("val",value);

			// if (index==values.length-1) {
			// 	this.selectors[index].next()
			// };

		}.bind(this))
	}
	else {
		this.selectCollege();
	}
}


Selectors.prototype.Selectors=Selectors;
var instance = new Selectors();
window.selectors = instance;
$(function () {
	instance.main()
})
