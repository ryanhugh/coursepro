'use strict';
var request = require('request');
var assert = require('assert');
var URI = require('URIjs');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var fs = require('fs');

var pointer = require('../pointer');

function BaseParser () {
	this.requiredAttrs = [];
}


BaseParser.prototype.supportsPage = function() {
	return false;
};

//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
BaseParser.prototype.parse = function(pageData,callback) {
	pointer.request(pageData.dbData.url,{requiredInBody:this.requiredInBody},function (err,dom) {
		if (err) {
			return callback(err);
		};
		
		//record the main hostname in the url TODO
		this.parseDOM(pageData,dom);

		pageData.setData('lastUpdateTime',new Date().getTime());

		callback();

	}.bind(this));
};


//html parsing helpers and common functions

BaseParser.prototype.isValidData = function(pageData) {
	
	//ensure that data has all of these attributes
	for (var attrName of this.requiredAttrs) {
		if (pageData.getData(attrName)===undefined) {
			console.log('MISSING',attrName)
			return false;
		};
	}
	return true;
};



BaseParser.prototype.onBeginParsing = function(pageData) {
	
};

BaseParser.prototype.onEndParsing = function(pageData) {

};

BaseParser.prototype.parseDOM = function(pageData,dom){


	this.onBeginParsing(pageData);


	domutils.findAll(this.parseElement.bind(this,pageData),dom);

	this.onEndParsing(pageData);

	//missed something, or invalid page
	if (!this.isValidData(pageData)) {
		console.log("ERROR: though url was good, but missed data", pageData);
		return null;
	};
}



//returns a {colName:[values]} where colname is the first in the column
//regardless if its part of the header or the first row of the body
BaseParser.prototype.parseTable = function(table) {
	if (table.name!='table') {
		console.trace('parse table was not given a table..')
		return;
	};


	//includes both header rows and body rows
	var rows = domutils.getElementsByTagName('tr',table);

	if (rows.length===0) {
		console.trace('zero rows???')
		return;
	};


	var retVal = {
		_rowCount:rows.length-1
	}
	var heads = []

	//the heeaders
	rows[0].children.forEach(function (element) {
		if (element.type!='tag' || ['th','td'].indexOf(element.name)===-1) {
			return;
		}

		var text = domutils.getText(element).trim().toLowerCase().replace(/\s/gi,'');
		retVal[text] = []
		heads.push(text);

	}.bind(this));



	//add the other rows
	rows.slice(1).forEach(function (row) {

		var index=0;
		row.children.forEach(function (element) {
			if (element.type!='tag' || ['th','td'].indexOf(element.name)===-1) {
				return;
			}
			if (index>=heads.length) {
				console.log('error, table row is longer than head, ignoring content',index,heads,rows);
				return;
			};

			retVal[heads[index]].push(domutils.getText(element).trim())

			//only count valid elements, not all row.children
			index++;
		}.bind(this));


		//add empty strings until reached heads length
		for (; index < heads.length; index++) {
			retVal[heads[index]].push('')
		};


	}.bind(this));
	return retVal;
};








BaseParser.prototype.getOptionallyPlural = function(num) {
	if (num>1) {
		return 's'
	}
	else {
		return ''
	}
};








BaseParser.prototype.tests = function () {

	var PageData = require('../PageData');

	fs.readFile('../tests/'+this.constructor.name+'/1.html','utf8',function (err,body) {
		if (err) {
			console.log(err)
			return
		};

		try{
			var fileJSON = JSON.parse(body);
		}
		catch (exception_var_1){
			console.log(JSON.stringify({
				url:"https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=2041&schd_in=BAS",
				body:body
			}))
			return;
		}
		
		

		pointer.handleRequestResponce(fileJSON.body,function (err,dom) {
			if (err) {
				console.trace(err);
			}

			if (this.constructor.name=="BaseParser") {
				console.log(this.parseTable(dom[0]))
			}
			else {
				var pageData = new PageData(fileJSON.url);
				this.parseDOM(pageData,dom);
				console.log("HERE",JSON.stringify(pageData,null,4));

			}

			
			// this.parseDOM()
		}.bind(this))




	}.bind(this));

}


if (require.main === module) {
	new BaseParser().tests();
}



BaseParser.prototype.BaseParser=BaseParser;
module.exports = new BaseParser()