
//google analytics
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
  
  ga('create', 'UA-67419497-1', 'auto');
  ga('send', 'pageview');
  
  
  
  
function Homepage () {
	
	
	this.homepageElement = document.getElementById('homepageId');
	this.container = document.getElementById('containerId');
	
	
	this.isOnHomepage = true;
	

}



Homepage.prototype.show = function () {
	
	if (this.isOnHomepage && 0) {
		return;
	}
	else {
		history.pushState(null, null, "#");
		render.clearContainer();
		this.container.appendChild(this.homepageElement);
	}
	
	
	
}



var instance = new Homepage();

Homepage.prototype.Homepage=Homepage;
window.homepage = instance;