# Backend

The backend is divided up into two main parts: Scraping and API. 


## Scraping 

1. Scraping starts with an entry point to a college's URL. A bunch of these urls can be found in differentCollegeUrls.js. 
2. Then, pageDataMgr.js finds a parser that says it can parse that URL. The parser parses the one specific page at the URL and adds dependencies (other parsers) to parse pages that the first page leads to. Those dependiencies then parse other pages and then add more parsers as dependencies to parse more pages. The order of parsers currently is:

Term -> Subject (and College) -> Links -> Class -> Section

3. After all the parsing is done and the data is loaded into mongo, the processors are ran. The processors run in series and can pretty much do whatever they want. Most of them dump the data from mongo, do some stuff to it (add fields, change fields, etc) and then upload it again. databaseDumps.js just dumps the data to a static file. 


## API 

The api is pretty simple and is just server.js connecting directly to the classes in database/ for the data. 

One of the processors makes dumps of the data in the database. This allows clients to get a lot more data a lot faster. These dumps are stored as files on the EC2 server's storage. The POST requests connect to the MongoDB backend. This takes longer, but the data in the database is updated more often. 

The API is documented here: https://github.com/ryanhugh/CoursePro-API


