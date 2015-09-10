'use strict';


function Render () {
	
	this.template = document.getElementsByClassName('templatePanelId')[0];
	this.container = document.getElementById('containerId');
	this.navBar = document.getElementById('navBar');
	if (!this.template || !this.container || !this.navBar) {
		console.log('error could not find template??',this.template,this.container,this.navBar)
	};
}


// http://stackoverflow.com/questions/4270485/drawing-lines-on-html-page
Render.prototype.drawLine =function(x1, y1, x2, y2,color){

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
	div.setAttribute('style','width:'+width+'px;height:0px;-moz-transform:rotate('+deg+'deg);-webkit-transform:rotate('+deg+'deg);position:absolute;top:'+y+'px;left:'+x+'px;');   
	div.style.zIndex = '-999'
	div.style.border = '4px solid '+color; 
	div.style.borderRadius = '99px'
	this.container.appendChild(div);
	return div;
}
 

Render.prototype.calculateLine = function(tree) {

	tree.allParents.forEach(function (parent) {
		if (!parent) {
			console.log('not drawing line from',tree.name)
			return
		};
		if (tree.lineToParent) {
			tree.lineToParent.remove();
		};
		
		var subDiv = tree.panel;
		if (!subDiv) {
			console.log(tree,'????????? error')
		};
		
		var subDivBounds = subDiv.getBoundingClientRect()

		var cloneX = subDivBounds.left+subDiv.offsetWidth/2-this.container.getBoundingClientRect().left
		var cloneY = subDivBounds.top+subDivBounds.height/2

		if (!parent.panel) {
			console.log('no panel on parent???',tree)
			return;
		};
		var parentDivBounds = parent.panel.getBoundingClientRect()

		var parentX = parentDivBounds.left+parent.panel.offsetWidth/2-this.container.getBoundingClientRect().left
		var parentY = parentDivBounds.top+parentDivBounds.height/2

		//draw the line
		var color = this.getColor(parent.type);
		if (!color) {
			console.log('error could not get color of ',tree)
			return;
		};
		tree.lineToParent = this.drawLine(parentX,parentY,cloneX,cloneY,color);
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
Render.prototype.getLowestParent = function(parents) {	
	if (parents.length==0) {
		return
	};

	var lowestParent = parents[0];
	for (var i = 0; i < parents.length; i++) {
		if (parents[i].depth>lowestParent) {
			lowestParent = parents[i];
		}
	}
	return lowestParent;
}
Render.prototype.addToParentDiv = function(tree) {
	var parent = this.getLowestParent(tree.allParents);
	if (parent && !parent.panel) {
		console.log('error parent has no panel tree:',tree)
	};
	
	if (parent) {
		if (!parent.div) {
			console.log('parent does not have a div!!',parent)
			return;
		}
		parent.div.appendChild(tree.div);
	}
	else {
		tree.div.style.minWidth="100%"
		this.container.appendChild(tree.div)
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
Render.prototype.addStructure = function(tree) {

	if (!tree.div && !tree.panel) {

		tree.div = document.createElement('div');
		tree.div.className = 'holderDiv'
		tree.div.style.display="inline-block"
		tree.div.style.margin="0 auto"
		tree.div.style.padding="20px"

		if (tree.isClass) {
			tree.filler = document.createElement('div');
			tree.panel = this.template.cloneNode(true);
			tree.panel.style.display =''

			this.resetPanel(tree,false);
			
			//position the panel to the absolute position of the div
			
			this.addToParentDiv(tree);
			this.container.appendChild(tree.panel);
			//adds this div to parent div

			console.log('creating filler with,',tree.panel.offsetWidth,tree.panel.offsetHeight)
			tree.filler.style.width = tree.panel.offsetWidth + 'px'
			tree.filler.style.height = tree.panel.offsetHeight + 'px'
			tree.filler.style.margin = '0 auto'
			tree.filler.className='filler'
			tree.div.appendChild(tree.filler);
		}
		else {

			//make a circle
			tree.panel = document.createElement('div');
			tree.panel.style.backgroundColor = this.getColor(tree.type);
			tree.panel.style.width = '35px';
			tree.panel.style.height = '35px';
			tree.panel.style.borderRadius = '50%';
			tree.panel.style.margin = '0 auto';
			tree.div.appendChild(tree.panel);
			this.addToParentDiv(tree);
		}
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
Render.prototype.addPanels = function(tree) {
	if (tree.isClass) {

		var coords = tree.filler.getBoundingClientRect();
		tree.x = coords.left + coords.width/2;
		tree.y = coords.top + coords.height/2;
		console.log('rect is ',coords.left,coords.top)

		this.resetPanel(tree);
	}

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addPanels(subTree);
		}.bind(this));
	};
}


Render.prototype.resetPanel = function(tree,relocate) {
	if (relocate===undefined) {
		relocate=true;
	};

	var xButton = tree.panel.getElementsByClassName('glyphicon-remove')[0]
	xButton.style.display = 'none'

	tree.isExpanded=false;
	tree.panel.setAttribute('style','width:165px;margin: 0 auto;cursor:pointer;white-space:normal')
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
				console.log('erorr, no crns found!?',tree,tree.url)
				panelBody.innerHTML = ''
			}
			else {
				panelBody.innerHTML = tree.crns.length + ' section'+this.getOptionalS(tree.crns.length)+' this term'
			}
		}
		else {
			panelBody.innerHTML = ''

		}
	}

	if (relocate) {

		tree.panel.style.position = 'absolute';
		tree.panel.style.top =  (tree.y - tree.panel.offsetHeight/2 ) + 'px';
		tree.panel.style.left = (tree.x - tree.panel.offsetWidth/2  ) + 'px';
	};
}


Render.prototype.addLines = function(tree) {
	this.calculateLine(tree);

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addLines(subTree);
		}.bind(this))
	}
}


Render.prototype.go = function(tree) {
	this.tree = tree; 

	//remove everything in the container for a new tree
	while (this.container.firstChild) {
	    this.container.removeChild(this.container.firstChild);
	}
	this.container.style.paddingTop = (this.navBar.offsetHeight+75) + 'px'

	this.addStructure(this.tree)
	this.addPanels(this.tree)
	popup.addPopups(this.tree)
	this.addLines(this.tree)

	//scroll to the middle of the page, and don't touch the scroll height
	window.scrollTo(document.body.scrollWidth/2-document.body.offsetWidth/2 ,document.body.scrollTop)
};


var instance = new Render();

Render.prototype.Render=Render;
window.render = instance;



window.onresize = function(event) {
	if (!instance.tree) {
		return;
	};

    instance.addPanels(instance.tree);
	instance.addLines(instance.tree)
};
console.log('hiii')