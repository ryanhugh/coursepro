'use strict';

// This file dumps all relevent classes from the DB into RAM in the pre parsing hook
// and then checks to see if they changed after updating
// and if they did, fire off notifications.

// This used to be done by having an update hook in classesDB, and whenever a row was updated check to see if it was a class that was being watched,
// and if it was and if the class changed, fire off notifications. However, the processors would download the class rows and change fields, which 
// would count as updates when the parsers would run again because it was different than what the parsers were parsing. 

// Another way to do this would be to only upload the data to the DB after parsing and processing, but then it might cause a race condition if the row in the DB
// was updated by something else between when the data was downloaded before parsing and when it was uploaded after processing. 
// If the data in the DB changed between when the rows were downloaded and uploaded any changes would be silently overwritten. 

var macros = require('../macros')
var BaseProcessor = require('./baseProcessor').BaseProcessor;
var classesDB = require('../databases/classesDB')
var sectionsDB = require('../databases/sectionsDB')
var subjectsDB = require('../databases/subjectsDB')
var Keys = require('../../common/Keys')


