'use strict';


function Selectors () {

	this.selectCollegeElement = $(".selectCollege")
	this.selectTermElement = $(".selectTerm")
	this.selectSubjectElement = $(".selectSubject")
	this.selectClassElement = $(".selectClass")

	//order of selectors for hiding all future selectors
	//etc
	this.selectors = [{
		element: this.selectCollegeElement,
		value:''
	},{
		element: this.selectTermElement,
		value:''
	},{
		element: this.selectSubjectElement,
		value:''
	},{
		element: this.selectClassElement,
		value:''
	}]
}


Selectors.prototype.setCurrentValue = function(element,value) {
	this.selectors.forEach(function (selector) {
		if (selector.element==element) {
			selector.value = value;
		};
	}.bind(this))
}

Selectors.prototype.getCurrentValue = function(element) {
	for (var i = 0; i < this.selectors.length; i++) {
		if (this.selectors[i].element===element) {
			return this.selectors[i].value
		}
	}
	console.log('given selector was not found!?!',element)
	console.trace();
}
Selectors.prototype.resetElement = function(element) {
	if (element[0].options.length==0) {
		return;
	}
	element.select2("destroy").removeClass('select2-offscreen')
	element.empty()
	element.off('select2:close');
	element[0].value=''
}  

Selectors.prototype.resetAllFutureVals = function(element) {
	//find the element to reset all past
	var i =0;

	for (; i < this.selectors.length; i++) {
		if (this.selectors[i].element == element) {
			break;
		}
	}
	i++;

	//reset all past here
	for (; i < this.selectors.length; i++) {
		this.resetElement(this.selectors[i].element)
		this.selectors[i].element[0].value=''
	};
}
Selectors.prototype.setupSelector = function(selectElement,selectValues,className,callback) {
	
	this.setCurrentValue(selectElement,selectElement.val());
	this.resetElement(selectElement);
	
	if (selectValues.length===0) {
		console.log('nothing found!')
		$("#nothingFound").show();
		return;
	}
	$("#nothingFound").hide();


	selectElement.select2({data:selectValues});
	selectElement.select2({containerCssClass: className })
	selectElement.select2('open');

	//i would use .on('change'), but when setting the default value it dosent fire the 
	// change event on close. So keep track of the last element, and if 
	// it is different on close, fire the callback
	selectElement.on("select2:close",function (event) {
		var selection = selectElement.val();
		if (!selection) {
			return;
		}
		var curr = this.getCurrentValue(selectElement)
		if (selection==curr) {
			console.log('not chaning from ',curr,selection)
			return;
		}
		this.setCurrentValue(selectElement,selection)
		this.resetAllFutureVals(selectElement);

		console.log('selected',selection)
		callback();
	}.bind(this))
}


Selectors.prototype.selectCollege = function(callback) {
	request('/listColleges',function (err,body){
		if (err) {
			console.log(err);
			return callback(err)
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
		this.setupSelector(this.selectCollegeElement,selectValues,'collegeSelectContainer',callback);
	}.bind(this));
}
Selectors.prototype.selectTerm = function(callback) {
	request({
		url:'/listTerms',
		type:'POST',
		body:JSON.stringify({
			host:this.selectCollegeElement.val()
		})
	} ,function (err,body){
		if (err) {
			console.log(err);
			return callback(err)
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
		this.setupSelector(this.selectTermElement,selectValues,'termSelectContainer', callback);
	}.bind(this));
}

Selectors.prototype.selectSubject = function(callback) {
	request({
		url:'/listSubjects',
		type:'POST',
		body:JSON.stringify({
			host:this.selectCollegeElement.val(),
			termId:this.selectTermElement.val()
		})
	} ,function (err,body){
		if (err) {
			console.log(err);
			return callback(err)
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
		this.setupSelector(this.selectSubjectElement,selectValues,'subjectSelectContainer', callback);
	}.bind(this))
}

Selectors.prototype.selectClass = function(callback) {
	
	request({
		url:'/listClasses',
		type:'POST',
		body:JSON.stringify({
			host:this.selectCollegeElement.val(),
			termId:this.selectTermElement.val(),
			subject:this.selectSubjectElement.val()
		})
	} ,function (err,body){
		if (err) {
			console.log(err);
			return callback(err)
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
		this.setupSelector(this.selectClassElement,selectValues,'classSelectContainer', callback);
	}.bind(this));

}

Selectors.prototype.main = function() {
	this.selectCollege(function (err) {
		if (err) {
			console.log(err);
			return;
		}
		this.selectTerm(function (err) {
			if (err) { 
				console.log(err);
				return;
			}
			this.selectSubject(function (err) {
				if (err) {
					console.log(err);
					return;
				}
				this.selectClass(function (err) {
					if (err) {
						console.log(err);
						return;
					}
					treeMgr.createTree(this.selectCollegeElement.val(),this.selectTermElement.val(),this.selectSubjectElement.val(),this.selectClassElement.val())
				}.bind(this))
			}.bind(this))
		}.bind(this))
	}.bind(this))
}


Selectors.prototype.Selectors=Selectors;
var instance = new Selectors();
window.selectors = instance;
instance.main()
