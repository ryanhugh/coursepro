'use strict';
var path = require('path');
var fs = require('fs')

function fixCWD () {
	
	
	while (1) {
		try {
		    fs.statSync('package.json');
		}
		catch (e) {
			//cd .. until in the same dir as package.json, the root of the project
		    process.chdir('..');
		    continue;
		}
		console.log('yep')
		return;
	}
}
// fixCWD();


// var cwd = process.cwd();
// if (_(filePath).endsWith('pack') || _(filePath).endsWith('databases')) {
// 	filePath = path.join(filePath,'..')
// }
