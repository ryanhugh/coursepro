'use strict';
var moment = require('moment')

var directiveMgr = require('./directiveMgr')
var BaseDirective = require('./BaseDirective')

var downloadTree = require('./downloadTree')
var treeMgr = require('./treeMgr')
var render = require('./render')
var popup = require('./popup')
var help = require('./help')
var Class = require('./Class')
var macros = require('./macros')


//thing that calls on download tree, treeMgr, render, popup and help
//manages the page that generates the tree graphs

function Graph($scope, $routeParams) {
	BaseDirective.prototype.constructor.apply(this, arguments);
	this.macros = macros;


	this.createGraph($routeParams)

}

Graph.isPage = true;
Graph.url = '/graph/:host/:termId/:subject/:classId'


Graph.prototype.setupUUIDLinks = function (tree) {

	tree.panel = document.getElementById(tree.uuid)

	tree.prereqs.values.forEach(function (subTree) {
		this.setupUUIDLinks(subTree);
	}.bind(this));

	tree.coreqs.values.forEach(function (subTree) {
		this.setupUUIDLinks(subTree);
	}.bind(this));
};

Graph.prototype.getCoords = function (tree) {

	var coords = tree.panel.getBoundingClientRect();

	tree.x = coords.left + tree.panel.offsetWidth / 2 + document.body.scrollLeft;
	tree.y = coords.bottom - tree.panel.offsetHeight / 2 + document.body.scrollTop;

	tree.prereqs.values.forEach(function (subTree) {
		this.getCoords(subTree);
	}.bind(this));

	tree.coreqs.values.forEach(function (subTree) {
		this.getCoords(subTree);
	}.bind(this));
};

Graph.prototype.go = function (tree, callback) {
	downloadTree.fetchFullTree(tree, function (err, tree) {
		if (err) {
			return callback(err);
		};

		treeMgr.go(tree);


		// render.go(tree);
		// popup.go(tree);
		// help.go(tree);
		// this.tree = tree;
		//SOMEWHERE ENsure that all class have prettyurl, and if not copy over url

		this.$scope.tree = tree;
		this.$scope.$apply()

		this.setupUUIDLinks(tree)
		this.getCoords(tree);
		render.addLines(tree);

		callback(null, tree)
	}.bind(this))

};

Graph.prototype.createGraph = function (tree, callback) {
	if (!callback) {
		callback = function () {}
	}

	// var tree = Class.create(serverData)

	// if (!tree) {
	// 	console.log('ERROR failed to create tree with ',host,termId,subject,classId)
	// 	console.trace()
	// 	return callback('error')
	// };

	//process tree takes in a callback
	this.go(tree, function (err, tree) {
		if (err) {
			console.log('error processing tree', err, tree);
			return callback(err);
		}

		treeMgr.logTree(tree, {
			type: 'createTree'
		})
		callback(null, tree);
	}.bind(this));
}



Graph.prototype.showClasses = function (classList, callback) {
	if (classList.length < 1) {
		console.log('error show classes was called with 0 classes!')
		return;
	};

	// var tree = new Node();

	tree.prereqs.values = classList

	tree.host = classList[0].host
	tree.termId = classList[0].termId

	//hide the node for search
	// this must be false - 
	tree.hidden = true;


	tree = downloadTree.convertServerData(tree);

	//this is ghetto
	//remove the prereqs of the class given so they dont have trees coming down from them
	tree.prereqs.values.forEach(function (subTree) {
		subTree.prereqs.values = []
	}.bind(this))



	treeMgr.go(tree, callback);
}


// the given scope is the scope of a tree inside a recursions
Graph.prototype.updateScope = function ($scope, isMouseOver) {
	if ($scope.isExpanded) {
		$scope.style['box-shadow'] = 'gray 0px 0px 9px'
		$scope.style.zIndex = 999;
	}
	else {
		if (isMouseOver) {
			$scope.style['box-shadow'] = 'gray 0px 0px 6px'
			$scope.style.zIndex = 150;
		}
		else {
			$scope.style['box-shadow'] = 'gray 0px 0px 0px'
			$scope.style.zIndex = $scope.baseZIndex;
		}
	}
};

Graph.prototype.onMouseOver = function ($scope) {
	this.updateScope($scope, true);
}

Graph.prototype.onMouseOut = function ($scope) {
	this.updateScope($scope, false);
};

Graph.prototype.calculatePanelWidth = function (tree) {
	//calculate the width of this tree
	var panelWidth = 0;
	tree.sections.forEach(function (section) {
		if (section.meetings) {
			panelWidth += 330;
		}
		else {
			panelWidth += 185;
		}
	}.bind(this))

	if (panelWidth) {
		panelWidth = Math.min(970, panelWidth)
		if (tree.sections.length < 5) {
			panelWidth = 610;
		};
	}
	else {
		if (tree.desc) {
			panelWidth = tree.desc.length
		}
		else {
			panelWidth = ''
		}
	}
	if (panelWidth < 476) {
		panelWidth = 576
	};
	return panelWidth;
};

Graph.prototype.onClick = function ($scope, tree) {

	//this returns instantly if already loaded
	tree.loadSections(function (err) {
		$scope.isExpanded = !$scope.isExpanded;

		//if it failed, toggle isExpanded and update the scpe
		if (err) {
			console.log("ERRor loading loadSections", err)
		}
		//if it worked, calculate the panel width
		else {
			$scope.panelWidth = this.calculatePanelWidth(tree)

			popup.groupSectionTimes(tree.sections)
			
			if (tree.lastUpdateTime!==undefined) {
				tree.lastUpdateString = moment(tree.lastUpdateTime).fromNow()
			};
		}

		//$scope references just the $scope of the tree that was updated, 
		// this.$scope references everything, and contains $scope

		this.updateScope($scope, false);

		setTimeout(function () {
			this.$scope.$apply()
		}.bind(this), 0)

	}.bind(this))

};

// called for each recursive call in graphInner.html
Graph.prototype.initScope = function ($scope, tree) {
	//grab the default z index from the parent $scope, which in intended for this tree
	$scope.baseZIndex = $scope.$parent.baseZIndex

	// z index and shadow both change when expand and on mouse over
	$scope.style = {
		'box-shadow': 'gray 0px 0px 0px',
		zIndex: $scope.baseZIndex
	}
};

Graph.prototype.getCollegeName = function() {
	return selectorsMgr.college.getText();
};


Graph.prototype.Graph = Graph;
module.exports = Graph;
directiveMgr.addDirective(Graph)