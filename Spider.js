'use strict';
var needle = require('needle');
var htmlparser = require('htmlparser2');
var domutils = require('domutils');
var fs = require('fs');
var fScraper = require("form-scraper");
 

//takes in any url of a site, and fills the main db with all the classes and all the sections
//and puts

function Spider () {
  
};


//course catalog

// https://wl11gp.neu.edu/udcprod8/twbkwbis.P_GenMenu?name=homepage


// bwckschd.p_disp_dyn_sched


// https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_dyn_ctlg


Spider.prototype.request = function (url,callback) {
  
  needle.get(url, {
    follow_max         : 5,
    rejectUnauthorized : false,
    headers:  {
  			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:24.0) Gecko/20100101 Firefox/24.0',
  		    "Referer":url, //trololololol
  		    'Accept-Encoding': '*'
  		}
  }, function (error, response, body) {
			return callback(error,body);
  });
}



Spider.prototype.findFormElement = function (element) {
  
  
  var form = element;
  while (form.name!='form') {
    if (form.parent == form || !form.parent) {
      return null;
    }
    form=form.parent;
  }
  return form;
}

Spider.prototype.minYear = function(){
  return new Date().getFullYear();
}



//add inputs if they have a value = name:value
//add all select options if they have multiple
//add just the first select option if is only 1
Spider.prototype.parseForm = function (form) {
  
  var payloads = [];
  
  
  //inputs
  var inputs = domutils.getElementsByTagName('input',form);
  inputs.forEach(function(input){
    
    if (input.attribs.name===undefined || input.attribs.value===undefined){
      return;
    }
    
    var newData = {}
    newData[input.attribs.name]=input.attribs.value;
    payloads.push(newData);
  });
  
  
  var selects = domutils.getElementsByTagName('select',form);
  
  selects.forEach(function (select) {
    
    var options = domutils.getElementsByTagName('option',select);
    if (options.length===0) {
      console.log('ERROR:no options in form???',select);
      return;
    }
    
    console.log(select.attribs,'fdsa')
      
    //add all of them :)
    if (select.attribs.multiple!==undefined){
        
  		options.forEach(function (option){
  		    var text = domutils.getText(option).trim();
  		    
  		    
  		    //move all this to other function
  		    // if (text.toLowerCase()==='none') {
  		    //   return;
  		    // }
  		    
  		    //dont process this element on error
  		    // if (text.length<2) {
  		    //   console.log('ERROR: empty text on form?',url);
        //     return;
  		    // }
  		    
  		    // var year = text.match(/\d{4}/);
  		    // if (!year) {
  		    //   console.log('ERROR: could not find year for ',text,url);
  		    //   return;
  		    // }
  		    
  		    // //skip past years
  		    // if (parseInt(year)<this.minYear()) {
  		    //   return;
  		    // }
  		    
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
  
  
  return payloads;
  
  
}


//step 1, select the terms
//callback (err,url,[payloads])
Spider.prototype.parseTermsPage = function (url,callback) {
  
  if (!callback) {
    callback = function (){}
  }
  
  
  
  this.request(url,function (err,body) {
    if (err) {
      console.log('ERROR requests error step 1,',error);
      return callback(error);
    }
    
  	var handler = new htmlparser.DomHandler(function (error, dom) {
  		if (error) {
  			console.log('ERROR: college names html parsing error',error);
  			return callback(error);
  		}
  		
  		var selectElement = domutils.getElementById('term_input_id',dom);
  		if (!selectElement) {
  		  console.log('ERROR: no select element, idk',url)
  		  return callback('parse error');
  		}
  		
  		var options = domutils.getElementsByTagName('option',selectElement.children);
  		if (options.length === 0) {
  		  console.log('ERROR: no options on the menu?',url);
  		  return callback('parse error');
  		}
  		
  		var payloads = [];
  		
  		options.forEach(function (option){
  		    var title = domutils.getText(option).trim();
  		    
  		    
  		    
  		    if (title.toLowerCase()==='none') {
  		      return;
  		    }
  		    
  		    //dont process this element on error
  		    if (title.length<2) {
  		      console.log('ERROR: empty title on form?',url);
            return;
  		    }
  		    
  		    var year = title.match(/\d{4}/);
  		    if (!year) {
  		      console.log('ERROR: could not find year for ',title,url);
  		      return;
  		    }
  		    
  		    //skip past years
  		    if (parseInt(year)<this.minYear()) {
  		      return;
  		    }
  		    
  		    payloads.push({
  		      value:option.attribs.value,
  		      title:title
  		    });
  		    
  		    
  		}.bind(this));
  		
  		var formElement = this.findFormElement(selectElement);
  		if (!formElement) {
  		  console.log('ERROR: could not find form element',url)
  		  return callback('could not find form element')
  		}
  		
  		
  		var hitUrl = this.findBaseURL(url) + formElement.attribs.action
  		
  		console.log(hitUrl,payloads);
  		callback(null,hitUrl,payloads)

		  }.bind(this));
  
  	var parser = new htmlparser.Parser(handler);
  	parser.write(body);
  	parser.done();
  
  
    
    
  }.bind(this));
}



Spider.prototype.findBaseURL = function (url) {
  
    var splitAfter = ['bwckctlg.p','bwckschd.p'];
    
    for (var i=0;i<splitAfter.length;i++) {
      
      var index = url.indexOf(splitAfter[i]);
      
      if (index>-1) {
        return url.substr(0,index);
      }
    }
    
    console.log('ERROR: given url does not contain a split from');
    return null;
}




Spider.prototype.go = function(url) {
    
    var baseURL = this.findBaseURL();
    if (!baseURL) {
      return;
    }
    
    baseURL += 'bwckschd.p_disp_dyn_sched'
    
    
    
    
    
    
    
    
    //get
    
    
    
}



Spider.prototype.tests = function () {
  
  
	fs.readFile('./tests/'+this.constructor.name+'/termselection.json','utf8',function (err,body) {
	  
	 // console.log(JSON.stringify({
	 //   url:'https://ssb.cc.binghamton.edu/banner/bwckschd.p_disp_dyn_sched',
	 //   body:body
	 // }));
	 
	 var jsonBody = JSON.parse(body);
	 
	 
  	var handler = new htmlparser.DomHandler(function (error, dom) {
  		if (error) {
  			console.log('ERROR: college names html parsing error',error);
  			return callback(error);
  		}
  		console.log(jsonBody)
	 
    	 console.log(this.parseForm(dom))
	 
	 
		  }.bind(this));
  
  	var parser = new htmlparser.Parser(handler);
  	parser.write(jsonBody.body);
  	parser.done();
	 
	 
	  
	 //this.parseTermsPage
  // console.log(fScraper)
  
  
  
  // var formStructure = new fScraper.ScrapingFormProvider()
  
  // console.log(formStructure.__proto__)
  
  // formStructure.fetchFormDataFromHttpResponse(jsonBody.body);
  
  
  // var loginDetails = { user: "my user", password: "my password" };
   
  
  
  
  // this.parseTermsPage('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_dyn_sched')
}.bind(this));
}






if (require.main === module) {
	new Spider().tests();
}


module.exports = Spider
