# Common

Some small utilities that are shared across the backend and the frontend. 
  
macros.js contains constants that both the frontend and backend use.  
memoize.js is a slight modification of async.memoize.  

## Keys.js

The keys class is used to identify a given host/term/subject/class/section. 

Hosts are identified by a host:   
`{host:'neu.edu'}`  
Terms are identified by a host and a termId:  
`{host:'neu.edu', termId:'201710'}`  
Subjects are identified by a host, termId, and subject:  
`{host:'neu.edu', termId:'201710', subject:'CS'}`  
Classes are identified by a host, termId, subject, and classUid:  
`{host:'neu.edu', termId:'201710', subject:'CS', classUid:'4800_1303374065'}`  
- The backend parsers creates two different classes in the CoursePro database for sections that are different than the other sections but listed under the same classId. For instance, the Honors CS 2510 will be separate from non-Hon CS 2500. However, they will both have the same classId (2510) so classUid is used to distinguish one from the other. The parser will also split up 'First-Year Writing' and 'College Writing' which have different titles but are both listed under ENGW 1111. There are some other cases where the parser will split up too. 

Sections are identified by a host, termId, subject, classUid, and crn:  
`{host:'neu.edu', termId:'201710', subject:'CS', classUid:'4800_1303374065', crn:'10889'}`  


Keys.js verifies that when trying to create a specific instance (host or term or subject or class or section) that all the given information is there. (Eg, it will log an error if the create class method is called with only a host and a subject). Once created, it can create a hash that is used in a couple different places in the code. The code is not that long, but is used in many different places so it is good to have one central location to ensure it is consistent. 