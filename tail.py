import json
import re
# import datetime
from datetime import datetime, time,timedelta
import exceptions

while 1:
	try:
		a= raw_input()
	except exceptions.EOFError:
		exit()
	except Exception as e:
		print e.type
		exit()
	if not a:
		exit()
	try:
		b= json.loads(a)
	except:
		print a
		continue

	if 'searchTerm' in b:
		print 'Search for','"'+b['searchTerm']+'"',':',b['count']
		continue

	#shorten the userId
	if 'userId' in b['body']:
		b['body']['userId']=re.sub(r'[\W_]', '',b['body']['userId'])[0:5]


    #print the referrer, if it is not coursepro.io
	if 'referer' in b and 'coursepro.io' not in b['referer']:
		print b['referer'],
        
        
	print b['ip'],
	
        
	utcnow = datetime.utcnow()
	midnight_utc = datetime.combine(utcnow.date(), time(0))
	
	reqTime = datetime.fromtimestamp(int(b['time'])/1000)
	if reqTime>midnight_utc :
		print 'Today',
	elif reqTime>(midnight_utc- timedelta(days=1)):
		print 'Yesterday',
	else :
		print reqTime.strftime('%b %d %I:%M:%S %p'),
		
	
	
	
	print reqTime.strftime('%I:%M:%S %p'),
		
	print ' ',b['url'],
    	
        
       
        

	if b['body']!={}:
		print b['body']
	else:
		print
