'use strict';

var directiveMgr = require('../directiveMgr')
var BaseDirective = require('../BaseDirective')


function AutoCenterScroll($timeout) {

	function AutoCenterScrollInner() {

	}

	AutoCenterScrollInner.scope = true;


	AutoCenterScrollInner.prototype.getCoords = function (tree) {

		var retVal = {};


		var coords = tree.panel.getBoundingClientRect();

		retVal.x = coords.left + tree.panel.offsetWidth / 2 + document.body.scrollLeft;
		retVal.y = coords.bottom - tree.panel.offsetHeight / 2 + document.body.scrollTop;

		return retVal;

	};

	AutoCenterScrollInner.prototype.link = function (scope, element, attrs) {

		scope.$watch('tree', function () {
			$timeout(function () {

				var tree = scope.tree

				// if two giant trees are off screen, pick one and scroll to it
				// so something is on the screen when the loading finishes
				// http://localhost/#neu.edu/201630/EECE/4792
				if (tree.hidden && tree.prereqs.values.length > 0 && (tree.prereqs.values.length % 2) == 0) {

					//scroll to one of sub trees
					var x = tree.prereqs.values[parseInt(tree.prereqs.values.length / 2)].x
					window.scrollTo(x - $(window).width() / 2, document.body.scrollTop);
				}
				else {
					//scroll to the middle of the page, and don't touch the scroll height
					window.scrollTo(document.body.scrollWidth / 2 - $(window).width() / 2, document.body.scrollTop);
				}

			}.bind(this))

		}.bind(this))
	}

	var instance = new AutoCenterScrollInner();
	instance.link = instance.link.bind(instance)

	return instance;
}

AutoCenterScroll.fnName = 'AutoCenterScroll'
AutoCenterScroll.$inject = ['$timeout'];


AutoCenterScroll.prototype.AutoCenterScroll = AutoCenterScroll;
module.exports = AutoCenterScroll;
directiveMgr.addLink(AutoCenterScroll)