
# CoursePro

Easily navigate class registration data.


# Setup

``` 
git clone 
npm install
npm install gulp -g
npm install forever -g

# This lets nodejs bind to port 80 without root
sudo setcap 'cap_net_bind_service=+ep' (which nodejs)

```

# Running the code

#### gulp dev
Runs the code in development mode. Connects to the MongoDB coursepro_dev table for the data. 

#### gulp test
Runs the frontend and backend tests. Automatically re-runs when any file in frontend/, backend/ or common/ changes.

#### gulp btest
Same as gulp test, but just runs backend tests.

#### gulp ftest
Same as gulp test, but just runs frontend tests.

#### gulp prod
Runs the app in production mode. Don't actually use this to run in production, use run.sh instead. The only difference is that run.sh uses forever to restart the server if it ever crashes and redirects stdout and stderr to log files. 

#### gulp spider [-neu][-gatech][-brown][-swarthmore] [ etc...]
Scrapes the data from a specific college. Tees the output to a file, but you still might want to use `| tee log.log`. Takes anywhere from 20 min to a couple hours to run, totally depends on the college. NEU takes about 1 hour. 

