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

BaseParser.prototype.getDependancyDatabase = function(pageData) {
	return null;
};

//callback here is pageData (stuff to store in db), and metadata (stuff dont store in db)
BaseParser.prototype.parse = function(pageData,callback) {

	var pointerConfig = {
		requiredInBody:this.requiredInBody
	};

	//sending a post, add the data and a content type header
	if (pageData.dbData.postData) {
		pointerConfig.payload = pageData.dbData.postData;
		pointerConfig.headers = {
			'Content-Type': this.postContentType
		}
	};



	pointer.request(pageData.dbData.url,pointerConfig,function (err,dom) {
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

BaseParser.prototype.parseElement = function(pageData,element) {

};


BaseParser.prototype.onEndParsing = function(pageData) {

};

BaseParser.prototype.parseDOM = function(pageData,dom){


	this.onBeginParsing(pageData,dom);

	domutils.findAll(this.parseElement.bind(this,pageData),dom);

	this.onEndParsing(pageData,dom);

	//missed something, or invalid page
	if (!this.isValidData(pageData)) {
		console.log("ERROR: though url was good, but missed data", pageData);
		return null;
	}

	pageData.setData('host',pointer.getBaseHostname(pageData.dbData.url));

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
				console.log('warning, table row is longer than head, ignoring content',index,heads,rows);
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



//add inputs if they have a value = name:value
//add all select options if they have multiple
//add just the first select option if is only 1
BaseParser.prototype.parseForm = function (url,dom) {

	//find the form, bail if !=1 on the page
	var forms = domutils.getElementsByTagName('form',dom);
	if (forms.length!=1) {
		console.log('there is !=1 forms??',forms,url);
		return
	}
	var form = forms[0];

	var payloads = [];

	//inputs
	var inputs = domutils.getElementsByTagName('input',form);
	inputs.forEach(function(input){

		if (input.attribs.name===undefined || input.attribs.type=="checkbox"){
			return;
		}

		if (input.attribs.value === undefined || input.attribs.value=='') {
			input.attribs.value=''
		}

		payloads.push({
			name:input.attribs.name,
			value:input.attribs.value
		});
	});


	var selects = domutils.getElementsByTagName('select',form);

	selects.forEach(function (select) {

		var options = domutils.getElementsByTagName('option',select);
		if (options.length===0) {
			console.log('ERROR:no options in form???',select);
			return;
		}
		
		//add all of them
		if (select.attribs.multiple!==undefined){

			options.forEach(function (option){
				var text = domutils.getText(option).trim();

				payloads.push({
					value:option.attribs.value,
					text:text,
					name:select.attribs.name
				});


			}.bind(this));
		}

		//just add the first select
		else {

			var alts=[];

			options.slice(1).forEach(function (option){
				var text = domutils.getText(option).trim();
				alts.push({
					value:option.attribs.value,
					text:text,
					name:select.attribs.name
				})
			})

			//get default option
			var text = domutils.getText(options[0]).trim();
			payloads.push({
				value:options[0].attribs.value,
				text:text,
				name:select.attribs.name,
				alts:alts
			});
		}
	});


	//parse the url, and return the url the post request should go to
	var urlParsed = new URI(url);

	return {
		postURL:urlParsed.protocol()+'://' +urlParsed.host() + form.attribs.action,
		payloads:payloads
	};
}







BaseParser.prototype.getOptionallyPlural = function(num) {
	if (num>1) {
		return 's'
	}
	else {
		return ''
	}
};






BaseParser.prototype.tests = function () {

  
  //make sure other classes have tests
  assert.equal(this.constructor.name,'BaseParser');
  
  
	fs.readFile('../tests/baseParser/1.html','utf8',function (err,body) {
	  assert.equal(null,err);
	  
		pointer.handleRequestResponce(body,function (err,dom) {
		  assert.equal(null,err);
			
			assert.deepEqual(this.parseTable(dom[0]),{ _rowCount: 1,
          type: [ 'Class' ],
          time: [ '11:00 am - 11:50 am' ],
          days: [ 'MWF' ],
          where: [ 'Anderson Hall 00806' ],
          partofterm: [ '1' ],
          daterange: [ 'Jan 12, 2015 - May 06, 2015' ],
          scheduletype: [ 'Base Lecture' ],
          instructors: [ 'Rujuta P.  Chincholkar-Mandelia (P)' ] });
    }.bind(this));
	}.bind(this));
	
	
	
	
	
	
	fs.readFile('../tests/baseParser/3.html','utf8',function (err,body) {
	  assert.equal(null,err);
	  var fileJSON = JSON.parse(body);
	  
		pointer.handleRequestResponce(fileJSON.body,function (err,dom) {
		  assert.equal(null,err);
			
			assert.deepEqual(this.parseTable(dom[0]),{ _rowCount: 2,
          headercontent1: [ 'Footer content 1', 'Body content 1' ],
          headercontent2: [ 'Footer content 2', 'Body content 2' ] });
    }.bind(this));
	}.bind(this));
	
	
	
	
	
	
  return;
  

  // tester.runTests(this.constructor.name,{
  //   '1.html':this.file1.bind(this)
  // });
  

	fs.readFile('../tests/'+this.constructor.name+'/1.html','utf8',function (err,body) {
		if (err) {
			console.log(err);
			return;
		}

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
				console.log(this.parseTable(dom[0]));
			}
			else {
			  
				var pageData = new PageData({dbData:{url:fileJSON.url}});
				this.parseDOM(pageData,dom);
				console.log("HERE",JSON.stringify(pageData,null,4));

			}

			
			// this.parseDOM()
		}.bind(this));




	}.bind(this));

};





BaseParser.prototype.BaseParser=BaseParser;
module.exports = new BaseParser();

if (require.main === module) {
  module.exports.tests();
}