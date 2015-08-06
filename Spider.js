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
Spider.prototype.parseForm = function (dom) {
  
  //find the form, bail if !=1 on the page
  var forms = domutils.getElementsByTagName('form',dom);
  if (forms.length!=1) {
    console.log('there is !=1 forms??',dom);
    return
  }
  var form = forms[0];
  
  
  
  
  var payloads = [];
  
  //inputs
  var inputs = domutils.getElementsByTagName('input',form);
  inputs.forEach(function(input){
    
    if (input.attribs.name===undefined || input.attribs.value===undefined){
      return;
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
    
    // console.log(select.attribs,'fdsa')
      
    //add all of them :)
    if (select.attribs.multiple!==undefined){
      console.log('adding all of ',select.attribs)
        
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
      console.log('using alts for',select.attribs)
      
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
  
  return payloads;
}


//step 1, select the terms
//callback (err,url,[payloads])
Spider.prototype.parseTermsPage = function (baseURL,callback) {
  
  if (!callback) {
    callback = function (){}
  }
  
  var url = baseURL + 'bwckschd.p_disp_dyn_sched'
  
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

  		var requestsData = [];

  		var defaultFormData = this.parseForm(dom);
  		if (!defaultFormData) {
  		  console.log('default form data failed')
  		  return callback('default form data failed');
  		}
  		
  		//find the term entry and all the other entries
  		var termEntry;
  		var otherEntries = [];
  		defaultFormData.forEach(function(entry) {
  		  if (entry.name=='p_term') {
  		    termEntry = entry;
  		  }
  		  else {
  		    otherEntries.push(entry);
  		  }
  		}.bind(this));
  		
  		//setup an indidual request for each valid entry on the form - includes the term entry and all other other entries
  		termEntry.alts.forEach(function(entry) {
  		  if (entry.name!='p_term') {
  		    console.log('ERROR: entry was alt of term entry but not same name?',entry);
  		    return;
  		  }
  		    
		    if (entry.text.toLowerCase()==='none') {
		      return;
		    }
		    
		    //dont process this element on error
		    if (entry.text.length<2) {
		      console.log('ERROR: empty entry.text on form?',url);
          return;
		    }
		    
		    var year = entry.text.match(/\d{4}/);
		    if (!year) {
		      console.log('ERROR: could not find year for ',entry.text,url);
		      return;
		    }
		    
		    //skip past years
		    if (parseInt(year)<this.minYear()) {
		      return;
		    }
		    
		    var fullRequestData = otherEntries.slice(0);
		    
		    fullRequestData.push({
		      name:entry.name,
		      value:entry.value,
		      text:entry.text
		    });
		    
		    requestsData.push(fullRequestData);
		  
  		}.bind(this));
  		
  		callback(null,requestsData);
  	})
  })
}


Spider.prototype.parseSearchPage = function (baseURL,callback) {
  if (!callback) {
    callback = function (){}
  }
  
  var url = baseURL + 'bwckschd.p_disp_dyn_sched'
  
  this.request(url,function (err,body) {
    if (err) {
      console.log('ERROR requests error step 1,',err);
      return callback(error);
    }
    
  	var handler = new htmlparser.DomHandler(function (error, dom) {
  		if (error) {
  			console.log('ERROR: college names html parsing error',error);
  			return callback(error);
  		}
  		
  		console.log(this.parseForm(dom));
  		callback(null,url,)
  		
  		
  	}.bind(this))
  }.bind(this))
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
    
    this.parseTermsPage(baseURL,function (err,url,payloads) {
      //just the first payload for now
      var payload = payloads[0]; //TODO
      
      
      
      
      
    })
    
    // baseURL += 'bwckschd.p_disp_dyn_sched'
    
    
    
    
    
    
    
    
    //get
    
    
    
}



Spider.prototype.tests = function () {
  
  
	fs.readFile('./tests/'+this.constructor.name+'/search.json','utf8',function (err,body) {
	  
	 // console.log(JSON.stringify({
	 //   url:'https://ssb.cc.binghamton.edu/banner/bwckgens.p_proc_term_date',
	 //   body:body
	 // }));
	 var jsonBody = JSON.parse(body);
	 
  	var handler = new htmlparser.DomHandler(function (error, dom) {
  		if (error) {
  			console.log('ERROR: college names html parsing error',error);
  			return callback(error);
  		}
  		console.log(this.parseForm(dom));
  		// console.log(jsonBody)
	 
    	 //console.log(this.parseForm(dom)[1])
	 
	 
		  }.bind(this));
  
  	var parser = new htmlparser.Parser(handler);
  	parser.write(jsonBody.body);
  	parser.done();
	 
	  
	 
	}.bind(this));
	
	
	fs.readFile('./tests/'+this.constructor.name+'/termselection.json','utf8',function (err,body) {
	  
	  
	 var jsonBody = JSON.parse(body);
	 
	 
  	var handler = new htmlparser.DomHandler(function (error, dom) {
  		if (error) {
  			console.log('ERROR: college names html parsing error',error);
  			return callback(error);
  		}
  		// console.log(jsonBody)
	 
    	 //console.log(this.parseForm(dom)[1])
	 
	 
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
