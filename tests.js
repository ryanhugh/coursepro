'use strict';
var requireDir = require('require-dir');
var parsers = requireDir('./parsers');
var databases = requireDir('./databases');
var pointer = require('./pointer');
var spider = require('./spider');


// //how do i cd into another dir???
process.chdir('databases');
for (var parserName in parsers) {
  parsers[parserName].tests();
}

// process.chdir('..');


//how do i cd into another dir???
	// for (var databaseName in databases) {
	//   databases[databaseName].tests();
	// }




pointer.tests();
spider.tests();
