# Backend

The backend is divided up into two main parts: Scraping and API. 


## Scraping 

- Scraping starts with an entry point to a college's URL. A bunch of these urls can be found in differentCollegeUrls.js. 
- Then, a starting PageData is created with that url and pageDataMgr.js finds a parser that says it can parse that URL. Right now, EllucianTermParser will match all the URLs in differentCollegeUrls.js.
- Then, EllucianTermParser runs and parses the HTML at that URL. 
- EllucianTermParser will create other PageDatas as dependencies to the starting PageData and will set their parsers to one of the parsers in the parsers folder.
- Then the other parsers will run and possibly add more dependencies to the pageData they are running on. 
- This process will continue recursively until none of the parsers add any dependencies to the pageData they are parsing. 


Right now:  
ellucianTermParser will add collegeNamesParser and ellucianSubjectParser as dependencies.   
And from ellucianSubjectParser the order is:  
ellucianSubjectParser -> ellucianClassListParser -> ellucianCatalogParser -> ellucianClassParser -> ellucianSectionParser


- After all the parsing is done and the data is loaded into mongo, the processors are ran. The processors run in series and can pretty much do whatever they want. Most of them dump the data from mongo, do some stuff to it (add fields, change fields, etc) and then upload it again. databaseDumps.js just dumps the data to a static file. 


## API 

The api is pretty simple and is just server.js connecting directly to the classes in database/ for the data. 

One of the processors makes dumps of the data in the database. This allows clients to get a lot more data a lot faster. These dumps are stored as files on the EC2 server's storage. The POST requests connect to the MongoDB backend. This takes longer, but the data in the database is updated more often. 

The API is documented here: https://github.com/ryanhugh/CoursePro-API


