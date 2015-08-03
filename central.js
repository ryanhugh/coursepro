'use strict';
var requireDir = require('require-dir');
var parsersClasses = requireDir('./parsers');

var parsers = [];
//create a list of parser objects
for (var parserName in parsersClasses) {
	parsers.push(new parsersClasses[parserName]())
}


function Central () {
}

//main starting point for parsing urls
//only url is required
PageData.prototype.processUrl = function(url,callback) {


};


global