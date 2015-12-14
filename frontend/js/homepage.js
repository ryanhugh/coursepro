'use strict';

function Homepage () {
	
	
	this.homepageElement = document.getElementById('homepageId');
	this.masterContainer = document.getElementById('masterContainerId');


}

Homepage.prototype.removeHomepage = function() {
	$(this.homepageElement).remove()
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




Homepage.prototype.show = function () {
	
	
	if (this.isOnHomepage()) {
		return;
	}

	document.body.style.height = '';
	document.body.style.width = '';


	this.masterContainer.appendChild(this.homepageElement);

}





Homepage.prototype.Homepage=Homepage;
module.exports = new Homepage();

