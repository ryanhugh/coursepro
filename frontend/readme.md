# Frontend  

The frontend is split into two main parts - the data structures and the UI. The data structures are written in pure ES5 so they can be re-used even if we decide to switch UI frameworks (react vs angular vs vue, etc)

## Data Structures
All the data structures are stored in `js/data/`.   All the methods on BaseData can be used on Host, Term, Subject, Class, or Section. 

### BaseData

####.create
Creates a new instance referencing a specific host, term, subject, class or section.   
Caches instances very aggressively and will return the same instance if given the same arguments. This makes creating instances very fast. 
Eg:
```
var host = Host.create({host: 'neu.edu'})

var section = Section.create({
                    host: 'neu.edu', 
                    termId: '201710', 
                    classUid: '5109_222885501',
                    subject: 'CS', 
                    crn: '15650'
                })
```

####.equals

Returns whether an instance is equal to another instance.
```
var host = Host.create({host: 'neu.edu'})
var host2 = Host.create({host: 'neu.edu'})
host.equals(host2) // true
host === host2 // also true
```

####.createMany

Returns an array of all possible instances with given properties.

```
var hosts = Host.createMany() // will return all hosts on the site
// Eg, [Host({host: 'neu.edu'}), Host({host: 'swarthmore.edu'})]

// Will return a list of all CS classes in term 201710.
var classes = Class.createMany({
            host: 'neu.edu',
            termId: '201710',
            subject: 'CS'
        })
```

####.download

Downloads more attributes and adds them to the object. Run this before accessing any properties other than the ones included in the arguments. Each different type of instance gets different attributes which are documented below. 

```
var host = Host.create({
    host: "neu.edu"
})

host.download(function(err) {
    console.log(host.title)
})
```

There are some more methods on BaseData but there shouldn't be any need to use them. 

### Host 
```
var host = Host.create({
    host: "swarthmore.edu"
})

host.download(function(err) {

    // Properties added to host
    host._id // 56b7ebd7ef27facc18daeac7
    host.host // "swarthmore.edu"
    host.title // "Swarthmore College"

})
```

### Term 
```
var term = Term.create({
    host: "swarthmore.edu",
    termId: "201602",
})

term.download(function(err) {

    // Properties added to term
    term._id // 56b7ebd7ef27facc18daeac7
    term.termId // "201602",
    term.text // "Spring 2016",
    term.host // "swarthmore.edu",

})
```

### Subject
```
var subject = Subject.create({
    host: "swarthmore.edu",
    subjectId: "201604",
    subject: "GREK"
})

subject.download(function(err) {

    // Properties added to subject
    subject._id // 56b7ebd7ef27facc18daeac7
    subject.termId // "201602",
    subject.host // "swarthmore.edu",
    subject.subject // "Greek"

})
```

### Class
```
var aClass = Class.create({
    host: "neu.edu",
    termId: "201710",
    subject: "CS",
    classUid: "5800_393721348"
})

aClass.download(function(err) {

    // Properties added to the class
    "_id": "57510335b462e991061cdd1a",
    "desc": "Presents the mathematical techniques used for the design and analysis ...",
    "classId": "5800",
    "prettyUrl": "https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_course_detail?cat_term_in=201710&subj_code_in=CS&crse_numb_in=5800",
    "name": "Algorithms",
    "classUid": "5800_393721348",
    "maxCredits": 4,
    "minCredits": 4,
    "url": "https://wl11gp.neu.edu/udcprod8/bwckctlg.p_disp_listcrse?schd_in=%25&term_in=201710&subj_in=CS&crse_in=5800",
    "host": "neu.edu",
    "termId": "201710",
    "subject": "CS",
    "lastUpdateTime": 1464926748052,
    "crns": ["11448", "16614", "17058"],
    "honors": false,

})
```


### Section
```
var section = Section.create({
    host: "neu.edu",
    termId: "201710",
    subject: "CS",
    classUid: "5800_393721348",
    crn: "16614"
})

section.download(function(err) {

    // Properties added to the section
    "_id": "56f21f93ea47044a05691b3e",
    "url": "https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_detail_sched?term_in=201610&crn_in=16614",
    "crn": "16614",
    "meetings": [{
        "startDate": 16687,
        "endDate": 16778,
        "profs": ["Professor name"],
        "where": "West Village H 210",
        "times": {
            "5": [{
                "start": 42300,
                "end": 48300
            }]
        }
    }],
    "host": "neu.edu",
    "termId": "201610",
    "subject": "CS",
    "classId": "5800",
    "classUid": "5800_393721348",
    "seatsCapacity": 19,
    "seatsRemaining": 0,
    "waitCapacity": 5,
    "waitRemaining": 2,
    "lastUpdateTime": 1458708371332

})
```

## UI

UI is all done in AngularJS. All of the folders except for the `data` folder is an angular directive or controller. They all inherent from baseDirective.js. directiveMgr.js manages all the directives and does some other small things. 


## Packaging JS/HTML into the /dist folder

All of the JavaScript in the `js` folder is packaged together into `/dist/js/app.js` file with browserify in gulpfile.js  
All of 3rd party libraries required by the JavaScript are bundled into `/dist/js/vendor.js`. When debugging code in Chrome DevTools, it is helpful to blackbox this script so the debugger only stops in `app.js`. 


All of the HTML is packaged together into `/dist/js/html.js` and is used with angular-template-cache.  All the HTML for every page is loaded as soon as any page is loaded, which avoids having to do networking requests when the user navigates to a new page. 
