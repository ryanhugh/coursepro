'use strict';

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


function GraphLineToParent($timeout) {

	function GraphLineToParentInner() {

	}

	GraphLineToParentInner.scope = true;
	GraphLineToParentInner.priority = 1;

	GraphLineToParentInner.prototype.link = function (scope, element, attrs) {

		scope.$watch('tree', function () {
			$timeout(function () {
				this.container = document.getElementById('containerId');
				this.addLine(scope.tree)


				window.addEventListener('resize', function (event) {
					this.addLine(scope.tree)
				}.bind(this));

			}.bind(this))

		}.bind(this))
	}

	GraphLineToParentInner.prototype.getColor = function (type) {
		if (type == 'or') {
			return '#0000ff'
		}
		else if (type == 'and') {
			return '#A70000'
		}
		else {
			elog('wtf, what is', type)
		}
	}

	GraphLineToParentInner.prototype.getCoords = function (tree) {

		var retVal = {};


		var coords = tree.panel.getBoundingClientRect();

		retVal.x = coords.left + tree.panel.offsetWidth / 2 + document.body.scrollLeft;
		retVal.y = coords.bottom - tree.panel.offsetHeight / 2 + document.body.scrollTop;

		return retVal;

	};


	GraphLineToParentInner.prototype.addLine = function (tree) {
		if (tree.isCoreq) {
			return;
		};

		if (tree.hidden) {
			console.log("hidden yo");
			return
		}
		if (!tree.lowestParent) {
			console.log("no parent yo");
			return;
		};
		if (tree.lowestParent.hidden) {
			return;
		};


		var treeCoords = this.getCoords(tree);

		tree.allParents.forEach(function (parent) {

			var parentCoords = this.getCoords(parent);
			this.drawLine(tree, treeCoords.x, treeCoords.y, parentCoords.x, parentCoords.y, this.getColor(parent.prereqs.type))

		}.bind(this))


	};


	// http://stackoverflow.com/questions/4270485/drawing-lines-on-html-page
	GraphLineToParentInner.prototype.drawLine = function (tree, x1, y1, x2, y2, color) {


		if (y1 < y2) {
			var pom = y1;
			y1 = y2;
			y2 = pom;
			pom = x1;
			x1 = x2;
			x2 = pom;
		}

		var a = Math.abs(x1 - x2);
		var b = Math.abs(y1 - y2);
		var c;
		var sx = (x1 + x2) / 2;
		var sy = (y1 + y2) / 2;
		var width = Math.sqrt(a * a + b * b);
		var x = sx - width / 2;
		var y = sy;

		a = width / 2;

		c = Math.abs(sx - x);

		b = Math.sqrt(Math.abs(x1 - x) * Math.abs(x1 - x) + Math.abs(y1 - y) * Math.abs(y1 - y));

		var cosb = (b * b - a * a - c * c) / (2 * a * c);
		var rad = Math.acos(cosb);
		var deg = (rad * 180) / Math.PI

		var htmlns = "http://www.w3.org/1999/xhtml";
		var div = document.createElementNS(htmlns, "div");
		div.setAttribute('style', 'width:' + width + 'px;height:0px;');
		div.style.border = '4px solid ' + color;
		div.style.borderRadius = '99px'

		var aElement = document.createElement('a')
		aElement.setAttribute('style', 'width:' + (width + 5) + 'px;height:0px;-moz-transform:rotate(' + deg + 'deg);-webkit-transform:rotate(' + deg + 'deg);top:' + y + 'px;left:' + x + 'px;');
		aElement.style.position = 'absolute';
		aElement.className = 'lineToParentLink'


		aElement.appendChild(div);

		var mouseOver = document.createElement('div');
		mouseOver.style.width = '100%'
		mouseOver.style.padding = '20px'
		mouseOver.style.marginTop = '-20px';


		aElement.appendChild(mouseOver)


		//remove the old lines (if the exist)
		if (tree.lineContainer) {
			tree.lineContainer.remove();
		}
		if (tree.lineToParent) {
			tree.lineToParent.remove()
		}
		if (tree.lineToParentLink) {
			tree.lineToParentLink.remove()
		}


		tree.lineContainer = document.createElement('div');
		tree.lineContainer.appendChild(aElement);

		this.container.appendChild(tree.lineContainer);

		tree.lineToParent = div;
		tree.lineToParentLink = aElement;
	}

	var instance = new GraphLineToParentInner();
	instance.link = instance.link.bind(instance)

	return instance;
}

GraphLineToParent.fnName = 'GraphLineToParent'
GraphLineToParent.$inject = ['$timeout'];


GraphLineToParent.prototype.GraphLineToParent = GraphLineToParent;
module.exports = GraphLineToParent;
directiveMgr.addLink(GraphLineToParent)