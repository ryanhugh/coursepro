'use strict';

function Search () {
	

	this.isOpen = false;
	this.searchBox = document.getElementById("searchBox");



	//focus the box when the search button is clicked
	document.getElementById("searchIcon").onclick = function(event){
		console.log('opening dropdown')
		search.isOpen = true;
		$("#searchDropdown").dropdown('toggle');//toggle only opens it and does not close it...

		setTimeout(function(){
			//close all the selectors
			selectors.closeAllSelectors();
			searchBox.focus();
		}.bind(this),0);
		//

		event.stopPropagation();
	}.bind(this);


	document.onclick = function (event) {
		console.log('closing dropdown')
		search.isOpen = false;
		$("#searchDropdown").parent().removeClass('open');
	}.bind(this)


	document.getElementById('searchBox').onkeypress = function(e){
		if (!e) e = window.event;
		var keyCode = e.keyCode || e.which;
		if (keyCode == '13'){
			this.go();
		}
	}.bind(this)

	document.getElementById('searchSubmitButton').onclick = this.go.bind(this);


}



Search.prototype.go = function() {
	



	// console.log('searching for ',searchBox.value)

	var collegeId = selectors.college.value;
	if (!collegeId) {
		console.log('need to select college first');
		return
	}

	var termId = selectors.term.value;
	if (!termId) {
		console.log('need to selecte term first');
		return;
	}

	var subject = selectors.subject.value;
	if (!subject) {
		console.log('need to select subject first');
		return;
	};



	console.log('yay',searchBox.value)

	request({
		url:'/search',
		type:'POST',
		body:{
			host:collegeId,
			termId:termId,
			subject:selectors.subject.value,
			value:searchBox.value
		}
	},function (err,results) {

		console.log('found ',results.length,' classes!');

		treeMgr.showClasses(results);
		// render.go(tree)
		

	}.bind(this))





};



Search.prototype.Search=Search;
var instance = new Search();
window.search = instance;

