'use strict';


var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')



function GraphPanelReposition($timeout, $document) {

	return {
		scope: true,
		link: function (scope, element, attrs) {

			element = element.parent()


			//get the height and width of the document when the page first loads
			$timeout(function () {

				var documentHeight = $document.height()
				var documentWidth = $document.width()

				scope.update = function () {

					document.body.style.height = ''
					document.body.style.width = ''


					// scope.$apply()
					// var tree = scope.tree;




					//then mess with the dom directly

					//this is slightly ghetto
					//move the panel if it is exending past the top/bottom/left/right of the screen
					//and make page scroll if extending past (top and bottom) or (right and left)

					var coords = element.offset();
					coords.right = element[0].offsetWidth + coords.left;
					coords.bottom = element[0].offsetHeight + coords.top;



					//don't mess with the dom if panel is not expanded
					if (!scope.isExpanded) {
						element[0].style.marginTop = '';
						element[0].style.marginLeft = '';
						return;
					};


					var edgePadding = 30.5
					var topPadding = 82.5

					var topMargin = 0;

					//top also accounts for navbar
					if (coords.top < topPadding) {
						topMargin = topPadding - coords.top
					}

					if (coords.bottom > documentHeight - edgePadding) {

						//had to move it down because it was above the top of the screen
						//so extend the bottom of the document
						if (topMargin != 0) {
							document.body.style.height = (element[0].offsetHeight + edgePadding + topPadding) + 'px'
						}
						else {
							topMargin = documentHeight - edgePadding - coords.bottom
						}
					}
					element[0].style.marginTop = topMargin + 'px'



					var minLeftSide = edgePadding;
					var leftMargin = 0;

					var left = element.offset().left


					if (left < minLeftSide) {
						leftMargin = minLeftSide - left;
					}



					var maxRightSide = documentWidth - edgePadding;

					if (coords.right > maxRightSide) {
						if (leftMargin != 0) {
							document.body.style.width = element[0].offsetWidth + 'px'
						}
						else {
							leftMargin = maxRightSide - coords.right;
						}
					}
					element[0].style.marginLeft = leftMargin + 'px'



				}.bind(this)
			}.bind(this))

			// scope.$watch('isExpanded', function (isExpanded) {

			// 	$timeout(function () {



			// 	}.bind(this))

			// }.bind(this))
		}.bind(this)
	}
}


GraphPanelReposition.dependencies = ['$timeout', '$document'];



GraphPanelReposition.prototype.GraphPanelReposition = GraphPanelReposition;
module.exports = GraphPanelReposition;
directiveMgr.addLink(GraphPanelReposition)