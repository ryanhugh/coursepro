'use strict';


function Render () {
	
	this.template = document.getElementsByClassName('templatePanelId')[0];
	this.container = document.getElementById('containerId');
	this.navBar = document.getElementById('navBar');

	this.spinner = document.getElementById('spinner')
	this.spinner.remove()

	this.COREQ_OFFSET = 20;

	if (!this.template || !this.container || !this.navBar) {
		console.log('error could not find template??',this.template,this.container,this.navBar)
	}

	if (localStorage.andPopupCount===undefined) {
		localStorage.andPopupCount = 0;
	}
	
	if (localStorage.orPopupCount===undefined) {
		localStorage.orPopupCount = 0;
	}
}


// http://stackoverflow.com/questions/4270485/drawing-lines-on-html-page
Render.prototype.drawLine =function(tree,x1, y1, x2, y2,color){

	if(y1 < y2){
		var pom = y1;
		y1 = y2;
		y2 = pom;
		pom = x1;
		x1 = x2;
		x2 = pom;
	}

	var a = Math.abs(x1-x2);
	var b = Math.abs(y1-y2);
	var c;
	var sx = (x1+x2)/2 ;
	var sy = (y1+y2)/2 ;
	var width = Math.sqrt(a*a + b*b ) ;
	var x = sx - width/2;
	var y = sy;

	a = width / 2;

	c = Math.abs(sx-x);

	b = Math.sqrt(Math.abs(x1-x)*Math.abs(x1-x)+Math.abs(y1-y)*Math.abs(y1-y) );

	var cosb = (b*b - a*a - c*c) / (2*a*c);
	var rad = Math.acos(cosb);
	var deg = (rad*180)/Math.PI

	var htmlns = "http://www.w3.org/1999/xhtml";
	var div = document.createElementNS(htmlns, "div");
	div.setAttribute('style','width:'+width+'px;height:0px;');
	div.style.border = '4px solid '+color;
	div.style.borderRadius = '99px'

	var aElement = document.createElement('a')
	aElement.setAttribute('style','width:'+(width+5)+'px;height:0px;-moz-transform:rotate('+deg+'deg);-webkit-transform:rotate('+deg+'deg);top:'+y+'px;left:'+x+'px;');
	aElement.style.position='absolute';
	aElement.className = 'lineToParentLink'


	aElement.appendChild(div);

	var mouseOver = document.createElement('div');
	mouseOver.style.width = '100%'
	mouseOver.style.padding = '20px'
	mouseOver.style.marginTop='-20px';

	
	aElement.appendChild(mouseOver)


	tree.lineContainer = document.createElement('div');
	tree.lineContainer.appendChild(aElement);

	this.container.appendChild(tree.lineContainer);


	tree.lineToParent = div;
	tree.lineToParentLink = aElement;
}


Render.prototype.calculateLine = function(tree) {

	tree.allParents.forEach(function (parent) {
		if (!parent) {
			console.log('error wtf there is an undefined parent added to tree ',tree)
			return
		};
		if (tree.lineToParent) {
			tree.lineToParent.remove();
		};
		
		
		if (!tree.panel) {
			console.log(tree,'????????? error')
		};
		if (!parent.panel) {
			console.log('no panel on parent???',tree)
			return;
		};
		//draw the line
		var color = this.getColor(parent.type);
		if (!color) {
			console.log('error could not get color of ',tree)
			return;
		};
		this.drawLine(tree,parent.x,parent.y,tree.x,tree.y,color);
	}.bind(this))

}
Render.prototype.getColor = function(type) {
	if (type=='or') {
		return '#0000ff'
	}
	else if (type=='and') {
		return '#A70000'
	}
	else {
		console.log('wtf, what is',type)
		console.trace()
	}
}
Render.prototype.addToParentDiv = function(tree) {
	
	if (tree.lowestParent && !tree.lowestParent.panel) {
		console.log('error tree.lowestParent has no panel tree:',tree)
	};
	
	if (tree.lowestParent) {
		if (!tree.lowestParent.div) {
			console.log('tree.lowestParent does not have a div!!',tree.lowestParent)
			return;
		}
		tree.lowestParent.div.appendChild(tree.div);
	}
	else {
		tree.div.style.minWidth="100%"
		this.container.insertBefore(tree.div,this.container.firstChild)
	}
}
Render.prototype.getOptionalS = function(num) {
	if (num===1) {
		return ''
	}
	else {
		return 's'
	}
}

//each tree panel only contains that tree's panel
//if a tree has coreqs, the tree.filler width and height is increased to account for these
//and then the coreqs are put on an offset in the top right direction


Render.prototype.calcPanelSize = function(tree) {

	//position the panel to the absolute position of the div
	this.resetPanel(tree,false);
	

	this.container.appendChild(tree.panel);
	
	tree.width = tree.panel.offsetWidth;
	tree.height = tree.panel.offsetHeight;

	if (tree.values) {
		tree.values.forEach(function(subTree) {
			this.calcPanelSize(subTree);
		}.bind(this))
	}

	if (tree.coreqs) {
		tree.coreqs.values.forEach(function (subTree) {
			this.calcPanelSize(subTree);
		}.bind(this));
	};
}
Render.prototype.addStructure = function(tree) {

	if (!tree.div) {

		tree.div = document.createElement('div');
		tree.div.className = 'holderDiv'
		tree.div.style.display="inline-block"
		tree.div.style.margin="0 auto"
		tree.div.style.padding="20px"
		tree.div.style.paddingBottom="0px"

		tree.filler = document.createElement('div');

		this.addToParentDiv(tree);

		//adds this div to parent div
		var fillerWidth = tree.width;
		var fillerHeight = tree.height;
		
		
		if (tree.coreqs) {
			fillerWidth += tree.coreqs.values.length*this.COREQ_OFFSET;
			fillerHeight += tree.coreqs.values.length*this.COREQ_OFFSET;
		}
		
		
		tree.filler.style.width = fillerWidth + 'px'
		tree.filler.style.height = (fillerHeight+10) + 'px'
		tree.filler.style.margin = '0 auto'
		tree.filler.className='filler'
		tree.div.appendChild(tree.filler);
	}
	else {
		console.log('tree has already been rendered')
	}

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addStructure(subTree);
		}.bind(this));
	};
}
Render.prototype.calcPanelPos = function(tree) {

	if (tree.coreqIndex===undefined) {
		
		var coords = tree.filler.getBoundingClientRect();
		
		tree.x = coords.left + tree.panel.offsetWidth/2;
		tree.y = coords.bottom - tree.panel.offsetHeight/2;
	}
	else {
		tree.x = tree.lowestParent.x + this.COREQ_OFFSET*(tree.coreqIndex+1);
		tree.y = tree.lowestParent.y - this.COREQ_OFFSET*(tree.coreqIndex+1)-this.COREQ_OFFSET;
	}

	this.resetPanel(tree);
	

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.calcPanelPos(subTree);
		}.bind(this));
	};

	if (tree.coreqs) {
		tree.coreqs.values.forEach(function (subTree) {
			this.calcPanelPos(subTree);
		}.bind(this));
	};
}


//only requires .width and .height if resizing
Render.prototype.resetPanel = function(tree,relocate) {
	if (relocate===undefined) {
		relocate=true;
	};

	tree.isExpanded=false;
	if (tree.isClass) {


		if (!tree.panel) {
			tree.panel = this.template.cloneNode(true);
		}

		var xButton = tree.panel.getElementsByClassName('glyphicon-remove')[0]
		xButton.style.display = 'none'

		tree.panel.setAttribute('style','width:165px;margin: 0 auto;cursor:pointer;white-space:normal;z-index:5;text-align:initial')
		var panelBody =tree.panel.getElementsByClassName('panelBodyId')[0];
		if (tree.isString) {
			tree.panel.getElementsByClassName('classTitleId')[0].innerHTML = tree.desc
		}
		else {
			tree.panel.getElementsByClassName('subjClassId')[0].innerHTML = tree.subject + ' '+tree.classId
			panelBody.setAttribute('style','line-height: 14px;white-space:nowrap')
			if (tree.dataStatus==treeMgr.DATASTATUS_DONE) {
				tree.panel.getElementsByClassName('classTitleId')[0].innerHTML = tree.name

				//this should never happen - all classes have at least [] for crns
				if (!tree.crns) {
					console.log('error, no crns found!?',tree,tree.url)
					panelBody.innerHTML = ''
				}
				else {
					panelBody.innerHTML = tree.crns.length + ' section'+this.getOptionalS(tree.crns.length)+' this term'
				}
			}
			else if (tree.dataStatus === treeMgr.DATASTATUS_FAIL) {
				panelBody.innerHTML = "0 sections this term"
			}
			else {
				panelBody.innerHTML = ''

			}
		}
	}
	else {

		if (!tree.panel) {
			tree.panel = document.createElement('div');
			this.container.appendChild(tree.panel);
		};

		//reset the circle
		tree.panel.style.backgroundColor = this.getColor(tree.type);
		tree.panel.style.width = '35px';
		tree.panel.style.height = '35px';
		tree.panel.style.borderRadius = '50%';
		tree.panel.style.margin = '0 auto';
		tree.panel.style.zIndex = '5';
	}


	if (relocate) {

		tree.panel.style.position = 'absolute';
		tree.panel.style.top =  (tree.y - tree.height/2 ) + 'px';
		tree.panel.style.left = (tree.x - tree.width/2  ) + 'px';
	};


	//calculate the z Index
	//z index is 999 if mouse if over element, else calculate
	tree.panel.onmouseover = function (event) {
		tree.panel.style.zIndex = '999';
	}.bind(this);

	tree.panel.onmouseout = function () {
		if (tree.isExpanded) {
			return;
		};


		if (tree.coreqIndex===undefined) {
			tree.panel.style.zIndex = '100'
		}
		else {
			tree.panel.style.zIndex = parseInt(tree.lowestParent.panel.style.zIndex)-tree.coreqIndex-1;
		}
	}.bind(this)

	tree.panel.onmouseout();
}


Render.prototype.addLines = function(tree) {
	this.calculateLine(tree);

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addLines(subTree);
		}.bind(this))
	}
}

//this is called before the loading starts
Render.prototype.clearContainer = function() {
	
	//remove everything in the container for a new tree
	while (this.container.firstChild) {
		this.container.removeChild(this.container.firstChild);
	}
}
Render.prototype.showSpinner = function() {
	this.spinner.style.display = ''
	this.container.appendChild(this.spinner)
};
Render.prototype.hideSpinner = function() {
	this.spinner.style.display = 'none'
};



Render.prototype.go = function(tree) {
	document.body.style.height = '';
	document.body.style.width = '';

	this.tree = tree;

	this.container.style.paddingTop = (this.navBar.offsetHeight+75) + 'px';

	this.calcPanelSize(this.tree);
	this.addStructure(this.tree);
	this.calcPanelPos(this.tree);

	this.addLines(this.tree);

	//scroll to the middle of the page, and don't touch the scroll height
	window.scrollTo(document.body.scrollWidth/2-document.body.offsetWidth/2 ,document.body.scrollTop);

	//remove the structure
	document.body.style.height = (this.container.scrollHeight + 50) + 'px'
	document.body.style.width = (this.container.scrollWidth + 50) + 'px'
	$('.holderDiv').remove();
	
	
	
};


var instance = new Render();

Render.prototype.Render=Render;
window.render = instance;