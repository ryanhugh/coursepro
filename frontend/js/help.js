
function Help () {
	
	this.HELP_POPUP_COUNT = 5

}


//find a line close to the starting tree that is > min length, and add the popover to it
//for both red and blue
// breath first search using stack
Help.prototype.addInitialHelp = function(tree) {

	var foundRed=false;
	var foundBlue=false;

	var stack = [tree];
	while (stack.length>0) {


		// remove the first element
		var currTree = stack.shift();

		if (currTree.values) {
			stack = stack.concat(currTree.values)
		}

		//the top most panel has no parent
		if (!currTree.lowestParent) {
			continue
		};


		if (currTree.lineToParent.offsetWidth>250) {
			

			//show max 1 of each type		
			if (currTree.lowestParent.type=='or') {
				if (foundBlue) {
					continue;
				}
				else {
					foundBlue = true;
				}
			}

			if (currTree.lowestParent.type == 'and') {
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
Help.prototype.activateHelpPopup = function(tree,x,y) {
	
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


		//because this is in a setTimeout, it will allways run after render changes the scroll positon, 
		// - which messes things up

		popoverJquery.css('top',(y -popover.offsetHeight/2-50+document.body.scrollTop) + 'px')
		popoverJquery.css('left',( x - popover.offsetWidth/2 +document.body.scrollLeft)+'px')
	},0)
}


Help.prototype.addHelpToolips = function(tree) {
	if (tree.lineToParentLink && tree.lineToParentLink.offsetWidth>200) {


		tree.lineToParentLink.setAttribute('tabindex','0');
		tree.lineToParentLink.setAttribute('data-placement','top');
		tree.lineToParentLink.setAttribute('data-toggle','popover');
		tree.lineToParentLink.setAttribute('data-trigger','manual');

		var linkElement = $(tree.lineToParentLink)

		tree.lineToParentLink.onmouseover = function (event) {
			

			//hide any other showing helps
			$('.lineToParentLink').not(tree.lineToParentLink).popover('hide')
			
			this.activateHelpPopup(tree,event.x,event.y)
			
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

Help.prototype.removeTooltips = function(tree) {
	
	$(tree.panel).tooltip('destroy');
	$(tree.panel).off('click.help');



	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.removeTooltips(subTree);
		}.bind(this))
	};

};



Help.prototype.addPanelHelp = function(tree) {
	if (localStorage.clickPopupHelpClicked) {
		return;
	};
	
	tree.panel.setAttribute('data-toggle','tooltip');

	$(tree.panel).tooltip({
		title:'Click to expand!',
		placement:function () {

			setTimeout(function () {
				this.$tip[0].style.left = tree.panel.offsetLeft + 'px'
				this.$arrow[0].style.left = ''
				
			}.bind(this),0);


			return 'auto';
		}
	})//left off .bind(this) so this.$tip will work


	$(tree.panel).on('click.help',function () {
		localStorage.clickPopupHelpClicked = true;

		//remove all the popups from all the panels
		this.removeTooltips(this.tree);

	}.bind(this))


	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addPanelHelp(subTree);
		}.bind(this))
	};


};

Help.prototype.go = function(tree) {
	this.tree=tree;
	
	this.addHelpToolips(tree);
	this.addInitialHelp(tree);
	this.addPanelHelp(tree);

};




var instance = new Help();

Help.prototype.Help=Help;
window.help = instance;