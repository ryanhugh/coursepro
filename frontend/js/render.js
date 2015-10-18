'use strict';


function Render () {
	
	this.template = document.getElementsByClassName('templatePanelId')[0];
	this.container = document.getElementById('containerId');
	this.navBar = document.getElementById('navBar');

	this.spinner = document.getElementById('spinner')
	this.spinner.remove()

	this.COREQ_OFFSET = 20;
	this.HELP_POPUP_COUNT = 5


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
Render.prototype.getLowestParent = function(tree) {
	if (tree.allParents.length===0) {
		return null;
	};

	var lowestParent = tree.allParents[0];
	for (var i = 0; i < tree.allParents.length; i++) {
		if (tree.allParents[i].depth>lowestParent) {
			lowestParent = tree.allParents[i];
		}
	}
	return lowestParent;
}
Render.prototype.addToParentDiv = function(tree) {
	var parent = this.getLowestParent(tree);
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
		tree.filler.style.height = fillerHeight + 'px'
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

		var parent = this.getLowestParent(tree);
		tree.x = parent.x + this.COREQ_OFFSET*(tree.coreqIndex+1);
		tree.y = parent.y - this.COREQ_OFFSET*(tree.coreqIndex+1)-this.COREQ_OFFSET;
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
			tree.panel.style.display =''
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
			var parent = this.getLowestParent(tree);
			tree.panel.style.zIndex = parseInt(parent.panel.style.zIndex)-tree.coreqIndex-1;
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


//find a line close to the starting tree that is > min length, and add the popover to it
//for both red and blue
// breath first search using stack
Render.prototype.addInitialHelp = function(tree) {

	var foundRed=false;
	var foundBlue=false;

	var stack = [tree];
	while (stack.length>0) {


		// remove the first element
		var currTree = stack.shift();

		if (currTree.values) {
			stack = stack.concat(currTree.values)
		}
		var parent = this.getLowestParent(currTree)

		//the top most panel has no parent
		if (!parent) {
			continue
		};


		if (currTree.lineToParent.offsetWidth>250) {
			

			//show max 1 of each type		
			if (parent.type=='or') {
				if (foundBlue) {
					continue;
				}
				else {
					foundBlue = true;
				}
			}

			if (parent.type == 'and') {
				if (foundRed) {
					continue;
				}
				else {
					foundRed = true;
				}
			};



			//get midpoint of line
			var lineCoords = currTree.lineToParent.getBoundingClientRect();
			
			var panelCoords = currTree.panel.getBoundingClientRect();

			//put the help 200px away from the panel
			if (lineCoords.width>400) {

				//need to figure out if line goes up/right or up/left
				var lineCenter = lineCoords.left+lineCoords.width/2;
				var panelCenter = panelCoords.left + lineCoords.width/2;


				var x;
				var y;
				var percent;
				//line goes up/right
				if (lineCenter>panelCenter) {
					x = lineCoords.right - 200;
					percent = 1-(x-lineCoords.left)/lineCoords.width;
					console.log('line was up/right')
				}

				//line goes up/left, get offset left+200
				else {
					x = lineCoords.left + 200;
					percent = (x-lineCoords.left)/lineCoords.width;
					console.log('line was up/left')
				}

				// percent=percent*2-.2;
				y = percent*lineCoords.height+lineCoords.top;

				//move the panel down a little
				// y+=100;

				console.log('setting to ',x,y,percent)
				this.activateHelpPopup(currTree,x,y);

			}
			else {
				//put the help in the middle of the line
				this.activateHelpPopup(currTree,lineCoords.left+lineCoords.width/2,lineCoords.top+lineCoords.height/2);
				
			}
		}

		if (foundRed && foundBlue) {
			return;
		};
	}
}
Render.prototype.activateHelpPopup = function(tree,x,y) {
	
	if (tree.allParents[0].type=='or'){
		if (localStorage.orPopupCount>this.HELP_POPUP_COUNT) {
			return;
		}
		else {
			localStorage.orPopupCount++;
		}
	}

	if (tree.allParents[0].type=='and'){
		if (localStorage.andPopupCount>this.HELP_POPUP_COUNT) {
			return;
		}
		else {
			localStorage.andPopupCount++;
		}
	}
	
	var linkElement = $(tree.lineToParentLink)
	linkElement.popover('show');

	setTimeout(function () {
		var popover = tree.lineContainer.getElementsByClassName('popover')[0]
		if (!popover) {
			return;
		};
		var popoverJquery = $(popover)

		popoverJquery.css('width','207px')
		popoverJquery.css('top',(y -popover.offsetHeight/2-50) + 'px')
		popoverJquery.css('left',( x - popover.offsetWidth/2 )+'px')
	},0)
}


Render.prototype.addHelpToolips = function(tree) {
	if (tree.lineToParentLink && tree.lineToParentLink.offsetWidth>200) {


		tree.lineToParentLink.setAttribute('tabindex','0');
		tree.lineToParentLink.setAttribute('data-placement','top');
		tree.lineToParentLink.setAttribute('data-toggle','popover');
		tree.lineToParentLink.setAttribute('data-trigger','manual');

		var linkElement = $(tree.lineToParentLink)

		tree.lineToParentLink.onmouseover = function (event) {
			

			//hide any other showing helps
			$('.lineToParentLink').not(tree.lineToParentLink).popover('hide')
			
			this.activateHelpPopup(tree,event.x+document.body.scrollLeft,event.y+document.body.scrollTop)
			
			//
		}.bind(this)

		tree.lineToParentLink.onmouseout = function (event) {
			linkElement.popover('hide');
		}.bind(this)



		linkElement.popover({
			content: function() {
				if (tree.allParents[0].type=='or') {
					return 'Take ANY of the connected classes to take this class!';
				}
				else {
					return 'Take ALL of the connected classes to take this class!';
				}
			}.bind(this),
			title: function() {
				if (tree.allParents[0].type=='or') {
					return 'Prerequisites: Blue Lines'
				}
				else {
					return 'Prerequisites: Red Lines'
				}
			}.bind(this)
		})
	};


	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addHelpToolips(subTree)
		}.bind(this))
	};
};

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

Render.prototype.go = function(tree,showBranches) {
	if (showBranches===undefined) {
		showBranches=true;
	}
	document.body.style.height = '';

	this.tree = tree;

	this.container.style.paddingTop = (this.navBar.offsetHeight+75) + 'px';

	this.calcPanelSize(this.tree);
	this.addStructure(this.tree);
	this.calcPanelPos(this.tree);

	if (showBranches) {
		this.addLines(this.tree);
		this.addHelpToolips(this.tree);
		this.addInitialHelp(this.tree);
	}

	//scroll to the middle of the page, and don't touch the scroll height
	window.scrollTo(document.body.scrollWidth/2-document.body.offsetWidth/2 ,document.body.scrollTop);

	//remove the structure
	document.body.style.height = (this.container.scrollHeight + 50) + 'px'
	$('.holderDiv').remove();
};


var instance = new Render();

Render.prototype.Render=Render;
window.render = instance;