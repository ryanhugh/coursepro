'use strict';


function Selectors () {



	this.class = {
		element: $(".selectClass"),
		value:'',
		setup:this.selectClass.bind(this),
		class:'classSelectContainer'
	}

	this.subject = {
		element: $(".selectSubject"),
		value:'',
		setup:this.selectSubject.bind(this),
		next:this.class,
		class:'subjectSelectContainer'
	}

	this.term = {
		element: $(".selectTerm"),
		value:'',
		setup:this.selectTerm.bind(this),
		next:this.subject,
		class:'termSelectContainer'
	}

	this.college = {
		element: $(".selectCollege"),
		value:'',
		setup:this.selectCollege.bind(this),
		next:this.term,
		class:'collegeSelectContainer'
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
			url.push(encodeURIComponent(dropdown.value));
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
Selectors.prototype.setupSelector = function(dropdown,selectValues,defaultValue) {
	
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

	var ids = _.map(selectValues,function (selectValue) {
		return selectValue.id;
	}.bind(this));

	if (!defaultValue || !_(ids).includes(defaultValue)) {
		dropdown.element.select2('open');
	}
	else {
		dropdown.value = defaultValue;
		dropdown.element.select2("val",defaultValue);
	}

	//i would use .on('change'), but when setting the default value it dosent fire the
	// change event on close. So keep track of the last element, and if
	// it is different on close, fire the callback
	dropdown.element.on("select2:close",function (event) {
		var selection = dropdown.element.val();
		if (!selection) {
			return;
		}
		
		if (selection==dropdown.value) {
			console.log('not changing from ',curr,selection)
			return;
		}

		dropdown.value = selection;
		this.resetAllFutureVals(dropdown);
		this.updateDeeplink()
		
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
			this.finish()
		}

	}.bind(this))
}


Selectors.prototype.selectCollege = function(defaultValue) {
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
		this.setupSelector(this.college,selectValues,defaultValue);
	}.bind(this));
}
Selectors.prototype.selectTerm = function(defaultValue) {
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
		this.setupSelector(this.term,selectValues,defaultValue);
	}.bind(this));
}

Selectors.prototype.selectSubject = function(defaultValue) {
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
		this.setupSelector(this.subject,selectValues,defaultValue);
	}.bind(this))
}

Selectors.prototype.selectClass = function(defaultValue) {
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
		this.setupSelector(this.class,selectValues,defaultValue);
	}.bind(this));
}

Selectors.prototype.finish = function() {
	treeMgr.createTree(this.college.value,this.term.value,this.subject.value,this.class.value)
}

Selectors.prototype.main = function() {
	if (window.location.hash.length>1) {
		var values = window.location.hash.slice(1).split('/')
		values.forEach(function (value,index) {
			value = decodeURIComponent(value)
			value = value.replace(/[^a-z0-9\/\.]/gi,'')


			this.selectors[index].setup(value);
			this.selectors[index].value = value

			//if at end, open next selector or create tree
			if (index == values.length-1) {
				if (this.selectors[index].next) {
					this.selectors[index].next.setup()
				}
				else {
					this.finish();
				}
			};

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
