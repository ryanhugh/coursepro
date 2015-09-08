'use strict';


function Render () {
	
	this.template = document.getElementsByClassName('templatePanelId')[0];
	this.container = document.getElementById('containerId');
	if (!this.template || !this.container) {
		console.log('error could not find template??',this.template,this.container)
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


Render.prototype.calculateLine = function(item) {

	item.allParents.forEach(function (parent) {
		if (!parent) {
			console.log('not drawing line from',item.name)
			return
		};
		if (item.lineToParent) {
			item.lineToParent.remove();
		};
		
		var subDiv = item.panel;
		if (!subDiv) {
			console.log(item,'????????? error')
		};
		
		var subDivBounds = subDiv.getBoundingClientRect()

		var cloneX = subDivBounds.left+subDiv.offsetWidth/2-this.container.getBoundingClientRect().left
		var cloneY = subDivBounds.top+subDivBounds.height/2

		if (!parent.panel) {
			console.log('no panel on parent???',item)
			return;
		};
		var parentDivBounds = parent.panel.getBoundingClientRect()

		var parentX = parentDivBounds.left+parent.panel.offsetWidth/2-this.container.getBoundingClientRect().left
		var parentY = parentDivBounds.top+parentDivBounds.height/2

		//draw the line
		var color = this.getColor(parent.type);
		if (!color) {
			console.log('error could not get color of ',item)
			return;
		};
		item.lineToParent = this.drawLine(parentX,parentY,cloneX,cloneY,color);
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
Render.prototype.addToParentDiv = function(item) {
	var parent = this.getLowestParent(item.allParents);
	if (parent && !parent.panel) {
		console.log('error parent has no panel item:',item)
	};
	
	if (parent) {
		if (!parent.div) {
			console.log('parent does not have a div!!',parent)
			return;
		}
		parent.div.appendChild(item.div);
	}
	else {
		item.div.style.minWidth="100%"
		this.container.appendChild(item.div)
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
Render.prototype.makeCircles = function(item) {

	if (!item.div && !item.panel) {

		item.div = document.createElement('div');
		item.div.className = 'holderDiv'
		item.div.style.display="inline-block"
		item.div.style.margin="0 auto"
		item.div.style.padding="20px"

		if (item.isClass) {
			item.filler = document.createElement('div');
			item.panel = this.template.cloneNode(true);
			item.panel.style.display =''

			this.resetPanel(item,false);
			
			//position the panel to the absolute position of the div
			
			this.addToParentDiv(item);
			this.container.appendChild(item.panel);
			//adds this div to parent div

			console.log('creating filler with,',item.panel.offsetWidth,item.panel.offsetHeight)
			item.filler.style.width = item.panel.offsetWidth + 'px'
			item.filler.style.height = item.panel.offsetHeight + 'px'
			item.filler.style.margin = '0 auto'
			item.filler.className='filler'
			item.div.appendChild(item.filler);
		}
		else {

			//make a circle
			item.panel = document.createElement('div');
			item.panel.style.backgroundColor = this.getColor(item.type);
			item.panel.style.width = '35px';
			item.panel.style.height = '35px';
			item.panel.style.borderRadius = '50%';
			item.panel.style.margin = '0 auto';
			item.div.appendChild(item.panel);
			this.addToParentDiv(item);
		}
	}
	else {
		console.log('tree has already been rendered')
	}

	if (item.values) {
		item.values.forEach(function (subItem) {
			this.makeCircles(subItem);
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
		tree.values.forEach(function (subItem) {
			this.addPanels(subItem);
		}.bind(this));
	};
}


Render.prototype.resetPanel = function(item,relocate) {
	if (relocate===undefined) {
		relocate=true;
	};


	item.isExpanded=false;
	item.panel.setAttribute('style','width:165px;margin: 0 auto;cursor:pointer;white-space:normal')
	var panelBody =item.panel.getElementsByClassName('panelBodyId')[0];
	if (item.isString) {
		item.panel.getElementsByClassName('classTitleId')[0].innerHTML = item.desc
	}
	else {
		item.panel.getElementsByClassName('subjClassId')[0].innerHTML = item.subject + ' '+item.classId
		panelBody.setAttribute('style','line-height: 14px;white-space:nowrap')
		if (item.dataStatus==treeMgr.DATASTATUS_DONE) {
			item.panel.getElementsByClassName('classTitleId')[0].innerHTML = item.name

			//this should never happen - all classes have at least [] for crns
			if (!item.crns) {
				console.log('erorr, no crns found!?',item,item.url)
				panelBody.innerHTML = ''
			}
			else {
				panelBody.innerHTML = item.crns.length + ' section'+this.getOptionalS(item.crns.length)+' this term'
			}
		}
		else {
			panelBody.innerHTML = ''

		}
	}

	if (relocate) {

		item.panel.style.position = 'absolute';
		item.panel.style.top =  (item.y - item.panel.offsetHeight/2 ) + 'px';
		item.panel.style.left = (item.x - item.panel.offsetWidth/2  ) + 'px';
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

	//remove everything in the container for a new tree
	while (this.container.firstChild) {
	    this.container.removeChild(this.container.firstChild);
	}
	this.container.style.paddingTop = ($('.navbar')[0].offsetHeight+75) + 'px'

	this.makeCircles(tree)
	this.addPanels(tree)
	popup.addPopups(tree)
	this.addLines(tree)
};

Render.prototype.Render=Render;
window.render = new Render();

