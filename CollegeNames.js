'use strict';
var Datastore = require('nedb');
var URI = require('uri-js');
var request = require('request');
var domutils = require('domutils');
var htmlparser = require('htmlparser2');
var he = require('he');
var needle = require('needle');
var fs = require('fs');
var whois = require('node-whois')
var changeCase = require('change-case');



function CollegeNames () {
	this.db = new Datastore({ filename: 'CollegeNames.db', autoload: true });
}


CollegeNames.prototype.gethomepage = function(url) {
  var homepage = URI.parse(url).host;
	if (!homepage) {
		console.log('ERROR: could not find homepage of',url,URI.parse(url));
		return;
	}

	var match =  homepage.match(/[^.]+\.[^.]+$/i);
	if (!match) {
	  console.log('ERROR: homepage match failed...',homepage);
	  return;
	}
	return match[0];
}



CollegeNames.prototype.standardizeNames = function(startStrip,endStrip,title) {
  // console.log(title);
  
  //get rid of newlines and replace large sections of whitespace with one space
  title=title.replace(/\n/g,'').replace(/\r/g,'').replace(/\s+/g,' ');
  
  // console.log(title);
 
  //remove stuff from the beginning
  startStrip.forEach( function(str){
    if (title.toLowerCase().indexOf(str)===0) {
      title=title.substr(str.length);
    }
  }.bind(this));
  
  // console.log(title);
  
  
  //remove stuff from the end
  endStrip.forEach( function(str){
    
    var index = title.toLowerCase().indexOf(str);
    if (index===title.length-str.length && index>-1) {
      title=title.substr(0,title.length-str.length);
    }
  }.bind(this));
  // console.log(title);
 
  // standardize the case
  title = changeCase.titleCase(title);
  // console.log(title);
  return title.trim();
}



CollegeNames.prototype.hitPage = function(homepage,callback) {
	
  console.log('firing request to ',homepage)
  
  
  needle.get('http://'+homepage, {
    follow_max         : 5,
    rejectUnauthorized : false,
    headers:  {
  			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:24.0) Gecko/20100101 Firefox/24.0',
  		    "Referer":homepage, //trololololol
  		    'Accept-Encoding': '*'
  		}
  }, function (error, response, body) {
		if (error) {
			console.log('REQUESTS ERROR:',homepage,error,body);
			
			if (error.code=='ENOTFOUND' || error.code=='ETIMEDOUT' || error.code=='ECONNRESET') {
			  if (homepage.indexOf('www.')===0) {
			    return callback('not found with www.');
			  }
			  else {
			    return this.hitPage('www.'+homepage,callback);
			  }
			}
			
			return callback(error);
		}
		else {
  		  
  		  
  
    	var handler = new htmlparser.DomHandler(function (error, dom) {
    		if (error) {
    			console.log(error);
    			return callback(error);
    		}
    		
  		  //find the title
  		    var elements = domutils.getElementsByTagName('title',dom);
  		    if (elements.length===0) {
  		      console.log('ERROR: ',homepage,'has no title??');
  		      return callback('no title');
  		    }
  		    else if (elements.length===1) {
  		      
  		      //get the text from the title element
  		      var title = domutils.getText(elements[0]).trim();
  		      if (title.length<2) {
  		        console.log('empty title',homepage,title);
  		        return callback('empty title');
  		      }
  		      title = he.decode(title);
  		      
  		      //get rid of newlines and replace large sections of whitespace with one space
  		      title=title.replace(/\n/g,'').replace(/\r/g,'').replace(/\s+/g,' ');
  		      
  		      
  		      //strip off any description from the end
  		      title = title.match(/[\w\d\s&]+/i);
  		      if(!title) {
  		        console.log('ERROR: title match failed,',homepage);
  		        return callback('title match failed')
  		      }
  		      
  		      title=title[0].trim();
  		       if (title.length<2) {
  		        console.log('empty title2',homepage,title);
  		        return callback('empty title2');
  		      }
  		      
  		      title = this.standardizeNames(['welcome to'],['home'],title);
  		      
  		      if (title.length===0) {
  		        console.log('Warning: zero title after processing',homepage);
  		        return callback('zero title after processing')
  		      }
  		      
  		      
  		      callback(null,title);
  		    }
  		  
  		  }.bind(this));
    
    	var parser = new htmlparser.Parser(handler);
    	parser.write(body);
    	parser.done();
		}
	}.bind(this));
};



CollegeNames.prototype.hitWhois = function (homepage,callback,tryCount) {
  
  if (tryCount===undefined) {
    tryCount=0;
  }
  
  
  whois.lookup(homepage, function(err, data) {
    if(err){
      
      
      if (tryCount<5 && err.code=='ECONNREFUSED') {
        
        setTimeout(function (){
          this.hitWhois(homepage,callback,tryCount+1);
        }.bind(this),500+parseInt(Math.random()*1000));
        
        return;
      }
      else {
        console.log('ERROR whois error',err,homepage,tryCount);
        return callback('whois error');
      }
      
    }
    
    var match=data.match(/Registrant:\n[\w\d\s&:]+?(\n|-)/i);
    
    if  (!match) {
      console.log('ERROR: whois regex fail',data,homepage);
      return callback('whois error');
    }
    
    var name = match[0].replace('Registrant:','').trim()
    
    // console.log(name,match);
    
    name =this.standardizeNames(['name:'],[],name);
    
    
    if (name.length<2) {
      console.log('Error: ')
      return callback('whois error');
    }
    
    callback(null,name);
    
  }.bind(this));

}




//no callback, could easily add one
CollegeNames.prototype.addToDB= function (homepage,title) {
  
  
  //add to db if not already in db
  this.db.find({homepage:homepage},function (err,docs) {
    
    if (docs.length!==0) {
      console.log('Warning: not inserting',homepage,'because it already exists');
      return;
    }
  
    this.db.insert({
      homepage:homepage,
      title:title
    });
    
  }.bind(this));
}


//hits database, and if not in db, hits page and adds it to db
CollegeNames.prototype.getTitle = function(url,callback) {
  
  
  var homepage= this.gethomepage(url);
  if(!homepage) {
    return callback(null);
  }
  
  this.db.find({homepage:homepage},function(err,docs) {
      
      //not in db, hit page and add it
      if (docs.length===0) {
        
        this.hitWhois(homepage,function (err,title) {
          if (err){
            return callback(err);
          }
          
          
          //no error, good to go
          this.addToDB(homepage,title);
          return callback(null,title);
        }.bind(this))
        
        
        return;
      }
      else if (docs.length>1) {
        console.log('ERROR: more than 1 match this homepage??',homepage);
      }
      
      //yay, return value
      // console.log('COLLGE NAMES cache hit',homepage,docs[0].title);
      return callback(null,docs[0].title);
  }.bind(this));
}






CollegeNames.prototype.tests = function() {
  
  
  
	fs.readFile('./test urls.json','utf8',function (err,body) {
	  
	  
	  
  JSON.parse(body).forEach(function(url){
        
    this.getTitle(url,function (err,title) {
      if  (err) {
    	  console.log('TEST: ',err,title,url);
      }
      else {
        console.log('GOOD:',title,url);
      }
      
      
      
  	}.bind(this));
      
      
  }.bind(this));
  
}.bind(this));
  
  
  
	
// 	this.getTitle('https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_dyn_sched',function (err,title) {
// 	this.getTitle('https://wl11gp.neu.edu/udcprod8/twbkwbis.P_GenMenu?name=bmenu.P_MainMnu&msg=WELCOME+Welcome,+Ryan+Hughes,+to+the+WWW+Information+System!Jul+11,+201503%3A33+pm',function (err,title) {
// 	this.getTitle('https://eagles.tamut.edu/texp/bwckschd.p_disp_dyn_sched',function (err,title) {
// 	this.getTitle('https://ssb.cc.binghamton.edu/banner/bwckschd.p_disp_dyn_sched',function (err,title) {
// 	  console.log(err,title);
// 	});
};


if (require.main === module) {
	new CollegeNames().tests();
}