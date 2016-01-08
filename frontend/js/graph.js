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
	console.log($routeParams)

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


Graph.prototype.loadSections = function(tree) {
	if (tree.sectionsLoadingStatus !== macros.DATASTATUS_DONE) {
		return;
	}

	
	if (tree.sectionsLoadingStatus !== macros.DATASTATUS_NOTSTARTED) {
		console.log("ERROR wtf section loading status",tree.sectionsLoadingStatus)
		return;
	};

	tree.loadSections(function (err) {
		if (err) {
			console.log("ERRor loading loadSections",err)
		}
		this.$scope.$apply()
	}.bind(this))
};


Graph.prototype.getUpdatedString = function(tree) {
	return moment(tree.lastUpdateTime).fromNow()
};


// the given scope is the scope of a tree inside a recursions
Graph.prototype.updateShadow = function($scope,isMouseOver) {
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

Graph.prototype.onMouseOver = function($scope) {
	this.updateShadow($scope,true);
}

Graph.prototype.onMouseOut = function($scope) {
	this.updateShadow($scope,false);
};

Graph.prototype.onClick = function($scope,tree) {
	$scope.isExpanded=!$scope.isExpanded;
	this.updateShadow($scope,false);
};

// called for each recursive call in graphInner.html
Graph.prototype.initScope = function($scope) {
	$scope.style={'box-shadow':'gray 0px 0px 0px'}
	if (!$scope.$parent.baseZIndex) {
		console.log("hiii");
	};

	$scope.baseZIndex = $scope.$parent.baseZIndex
	$scope.style.zIndex = $scope.baseZIndex;
};


Graph.prototype.Graph = Graph;
module.exports = Graph;
directiveMgr.addDirective(Graph)