
# CoursePro [![Travis CI Builds](https://travis-ci.org/ryanhugh/coursepro.svg?branch=master)](https://travis-ci.org/ryanhugh/coursepro/)  [![Website](https://img.shields.io/website/https/coursepro.io.svg)](https://coursepro.io)  [![GitHub issues](https://img.shields.io/github/issues/ryanhugh/coursepro.svg)](https://github.com/ryanhugh/coursepro/issues)  [![Greenkeeper badge](https://badges.greenkeeper.io/ryanhugh/coursepro.svg)](https://greenkeeper.io/)  [![GitHub license](https://img.shields.io/badge/license-AGPLv3-blue.svg)](https://raw.githubusercontent.com/ryanhugh/coursepro/master/license.txt) 

**This project is deprecated in favor of Search NEU. Most of the feature here are also available there, and we are working on adding support for the other features. Check out Search NEU at https://searchneu.com!**


Easily navigate class registration data.   

CoursePro scrapes all of the registration data from college sites (class description, seats open, seat capacity, class times and locations, professors, etc), and presents it in a much easier to use format. The most popular features are a prerequisite graph to visualize class prerequisites, automatic notifications when seats open up, and a calendar to show when during the week classes are.

The backend is written in NodeJS and the data is scraped into MongoDB. The frontend is written in AngularJS v1 and the prereq graph was created with D3.js. 


# Setup

``` 
git clone git@github.com:ryanhugh/coursepro.git
npm install yarn -g # If you don't already have yarn installed
yarn
yarn global add gulp forever

# Or if you want to use npm
npm install
npm install gulp forever -g


# This bash command lets nodejs bind to port 80 without root
sudo setcap 'cap_net_bind_service=+ep' $(which nodejs)

# or if you are using the fish shell
sudo setcap 'cap_net_bind_service=+ep' (which nodejs)

```

# Running the code

#### gulp dev
Runs the code in development mode. Connects to the MongoDB coursepro_dev table for the data. Messaged me and I will add your IP to the whitelist and send you the username + password. 

#### gulp test
Runs the frontend and backend tests. Automatically re-runs when any file in frontend/, backend/ or common/ changes. Does not need to connect to the database and can run totally offline. 

#### gulp btest
Same as gulp test, but just runs backend tests.

#### gulp ftest
Same as gulp test, but just runs frontend tests.

#### gulp prod
Runs the app in production mode. Don't actually use this to run in production, use run.sh instead. The only difference is that run.sh uses forever to restart the server if it ever crashes and redirects stdout and stderr to log files. 

#### gulp spider [-neu][-gatech][-brown][-swarthmore] [ etc...] | tee log.log
Scrapes the data from a specific college. Tees the output to a file, but you still might want to use `| tee log.log`. Takes anywhere from 20 min to a couple hours to run, totally depends on the college. NEU takes about 1 hour. I would recommend keeping a eye on the scrapers when scraping a college for the first time. Sometimes the spidering code can send so many requests that the school's registration website crashes. 

# Adding support for another college

Right now we have scrapers for Ellucian's Banner product and can support any college that uses that system. 
If your school uses this, we can add support for them pretty fast. Open a bug or send me a link your registration system.  
Check differentCollegeUrls.js for some examples of URLs. 

If they use something else, we would have to write scrapers for that system and it would require more work.


# More READMEs

This is the top level readme, there are more READMEs talking about more specific things in the folders. 

Let me know if you have any questions about anything! I can totally explain stuff in more detail than the READMEs do.

