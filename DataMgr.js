var Datastore = require('nedb');
var requireDir = require('require-dir');
var parsers = requireDir('./parsers');


function DataMgr () {
	this.db = new Datastore({ filename: 'database.db', autoload: true });
}


DataMgr.prototype.findSupportingParser = function(url) {

	for (var parserName in parsers) {
		var parser = new parsers[parserName]()
		if (parser.supportsPage(url)) {
			console.log('Using parser:',parser.constructor.name)
			return parser;
		};
	};
};

DataMgr.prototype.addData = function(data,existingData) {

	if (existingData) {
		this.db.update({ _id: existingData._id }, {$set:data}, {}, function (err, numReplaced) {	
			if (numReplaced==0) {
				console.log('ERROR: updated 0?',data,existingData);
			};
		});
	}
	else {
		this.db.insert(data);
	}
};


DataMgr.prototype.getDataFromURL = function(url,callback) {
	

	//if already in database, great
	this.db.find({url:url}, function (err,docs) {

		if (docs.length>1) {
			console.log('ERROR: docs is longer than 1?',docs);
			return;
		}

		//yay in cache and updated
		var fifteeenMinAgo = new Date().getTime()-900000;
		if (docs.length==1 && docs[0].lastUpdateTime>fifteeenMinAgo ) {
			console.log('CACHE HIT!',url)
			callback(docs[0]);
			return;
		};

		var parser = this.findSupportingParser(url);
		if (!parser) {
			console.log('no parser found for',url)
			callback(null);
			return;
		};
		console.log('using ',parser,' and data in db is len',docs.length)

		parser.getDataFromURL(url, function (data) {
			if (!data) {
				callback(null);
				return;
			};

			//add some other stuff to the data
			data.url=url
			data.lastUpdateTime = new Date().getTime();


			callback(data);

			if (docs.length==0) {
				this.addData(data);
			}
			else {
				this.addData(data,docs[0]);
			}
		}.bind(this));



	}.bind(this));
};


DataMgr.prototype.tests = function() {
	
	this.getDataFromURL('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_detail_sched?term_in=201120&crn_in=1445',function (data) {
		console.log(data)
	})

};


if (require.main === module) {
	new DataMgr().tests();
}



module.exports = DataMgr;