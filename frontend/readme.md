# Frontend  



## Packaging JS/HTML into the /dist folder

All of the JavaScript in the `js` folder is packaged together into `/dist/js/app.js` file with browserify in gulpfile.js  
All of 3rd party libraries required by the JavaScript are bundled into `/dist/js/vendor.js`. When debugging code in Chrome DevTools, it is pretty helpful to blackbox this script so the debugger only stops in `app.js`. 


All of the HTML is packaged together into `/dist/js/html.js` and is used with angular-template-cache.  Basically, all the HTML for every page is loaded as soon as any page is loaded, which avoids having to do networking requests when the user navigates to a new page. 


## Data Structures
All the data structures are stored in `js/data/`.   
**Note:** There is TON of caching behind the scenes in the data structures. Every time an instance of specific host/term/subject/etc.. is created, it is cached. If the same data structure is created again, the original instance is returned. This means many creation times are super fast, but the instances are *read only*. (If they are written to, any changes will also appear on the same instance in use by other parts of the code).

For NEU Fall 2016, there are about 7,000 classes (~7MB) and 6,000 sections (~6MB). 

All the data structures are written in pure JS in case we decide to switch to a differen UI framework (React vs Angular vs Polymer, etc.. ) later. 

Creating an instance:

```
var host = Host.create({
	host: "neu.edu"
})

var term = Term.create({
	host: "neu.edu",
    termId: "201710"
})

var subject = Subject.create({
	host: "neu.edu",
    termId: "201710",
    subject: "CS"
})

var aClass = Class.create({
	host: "neu.edu",
    termId: "201710",
    subject: "CS",
    classUid: "4800_1303374065"
})

etc...
```


Downloading data about an instance:

```
host.download(function(err){
	// After the host is downloaded, everything known about the instance will be added to the instance. 
    // For hosts, that is just .title ("Northeastern University"). eg
    // host.title == "Northeastern University"
})

term.download(function(err){
	// For terms, a .text is added:
    // term.text == "Spring 2017"
})

// Check out the *.tests.js files for a bunch of examples.
```

[add some more here]



## UI

UI is all done in AngularJS. All of the folders except for the `data` folder is an angular directive or controller. They all inherent from baseDirective.js. directiveMgr.js manages all the directives and does some other small things. 
