'use strict';



//everything in a graph that is shared between both classes and nodes in graph
// like loading a tree
function Node() {


	this.prereqs = {
		type: 'or',
		values: []
	}
	this.coreqs = {
		type: 'or',
		values: []
	}

	this.host = null;
	this.termId = null;


	//this is allways false, nodes are a different class
	this.isClass = false;
}


Node.create = function (host,termId) {
	if (!host || !termId) {
		console.log("ERROR missing host or termid node create",host,termId)
		console.trace()
		return null;
	};


	return new Node(host,termId);


}.bind(this)

module.exports = Node;

