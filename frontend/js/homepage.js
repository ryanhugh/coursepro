'use strict';

function Homepage () {
	
	
	this.homepageElement = document.getElementById('homepageId');
	this.masterContainer = document.getElementById('masterContainerId');

	

}

Homepage.prototype.removeHomepage = function() {
	this.homepageElement.remove()
};


Homepage.prototype.isOnHomepage = function() {
	
	// if the element has a parent, it is in the container, if not it needs to be added
	if (this.homepageElement.parentElement) {
		return true
	}
	else {
		return false;
	}
}



Homepage.prototype.clickHomeButton = function() {
	
	// if the element has a parent, it is in the container, if not it needs to be added
	if (this.isOnHomepage()) {
		return;
	}
	
	
	
	history.pushState(null, null, "#");// only do this if icon clicked, not if back used to show
	this.show();
};


Homepage.prototype.show = function () {
	
	
	// if the element has a parent, it is in the container, if not it needs to be added
	if (this.isOnHomepage()) {
		return;
	}

	document.body.style.height = '';
	document.body.style.width = '';


	render.clearContainer();
	this.masterContainer.appendChild(this.homepageElement);

}





Homepage.prototype.Homepage=Homepage;
module.exports = new Homepage();

