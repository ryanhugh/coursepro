


var searchBox = document.getElementById("searchBox");


function search() {
  
  console.log('searching for ',searchBox.value)
  
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
  
  
  console.log('yay',searchBox.value)
  
  
  
  
  
  
  
}

window.search = {}

search.isOpen = false;



$(function () {
  
  //focus the box when the search button is clicked
  document.getElementById("searchIcon").onclick = function(event){
    console.log('opening dropdown')
    search.isOpen = true;
    
    setTimeout(function(){
      //close all the selectors
      selectors.closeAllSelectors();
      searchBox.focus();
    },0);
    // event.stopPropagation();
  }.bind(this);
  
  
  document.onclick = function (event) {
    console.log('closing dropdwon')
    search.isOpen = false;
  }
  
  $('.stopPropagation')[0].onclick = function (event) {
    event.stopPropagation();
  }
  
  
  document.getElementById('searchBox').onkeypress = function(e){
    if (!e) e = window.event;
    var keyCode = e.keyCode || e.which;
    if (keyCode == '13'){
      search();
    }
  }
  
  document.getElementById('searchSubmitButton').onclick = search;
  
  
  
	window.selectors.main();
})
