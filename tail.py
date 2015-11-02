import json
import re
from datetime import datetime, time,timedelta
import exceptions
import sys


def getInput():
	try:
		a= raw_input()
	except exceptions.EOFError:
		sys.exit()
	except Exception as e:
		print e.type
		sys.exit()
		
	if not a:
		exit()
		
	try:
		b= json.loads(a)
	except:
		print a
		return None
	return b


def getTimeString(timeStamp):
	
	midnight_utc = datetime.combine(datetime.now(),time(0))
	
	reqTime = datetime.fromtimestamp(int(timeStamp)/1000)
	
	retVal=''
	
	if reqTime>midnight_utc :
		retVal+= 'Today'
	elif reqTime>(midnight_utc- timedelta(days=1)):
		retVal+= 'Yesterday'
	else :
		retVal+= reqTime.strftime('%b %d')
	
	retVal+=' '+reqTime.strftime('%I:%M:%S %p')
	
	return retVal
	


def main():
	line = getInput()
	if not line:
		return
	
	if line['method'] =='POST':
		
		#shorten the userId
		
		if 'userId' not in line['body']:
			print 'ERROR post had no user id??',line
			exit()
			
			
		line['body']['userId']=re.sub(r'[\W_]', '',line['body']['userId'])[0:5]
			
	elif line['method'] == 'GET':
		
		line['body']['userId']=' '*5
		
	else:
		print
		print 'ERROR line != get and != post??',line
		exit()
	
	line['time'] = getTimeString(line['time'])
	
	
	
	#print ip
	print line['ip'],
	
	if 'userId' in line['body']:
		print line['body']['userId'],
	
	print line['time'],
	
	
	print '%-15s' % line['url'],



	print ' ',
	if 'host' in line['body']:
		sys.stdout.write(line['body']['host']+'/')
	if 'termId' in line['body']:
		sys.stdout.write(line['body']['termId']+'/')
	if 'subject' in line['body']:
		sys.stdout.write(line['body']['subject']+'/')
	if 'classId' in line['body']:
		sys.stdout.write(line['body']['classId']+'/')
		
		
	print ' ',
		
	if 'email' in line['body']:
		sys.stdout.write(line['body']['email'])
			
	
			
	if 'searchQuery' in line['body']:
		print 'search for "'+line['body']['searchQuery']+'"',
	
	if 'type' in line['body'] and line['body']['type']=='createTree':
		print 'render tree',
	
	if 'classCount' in line['body']:
		print ' -> ',line['body']['classCount'],
		

	print


while 1:
	
	try:
		main()
	except Exception as e:
		print 'EXCEPTION!'
		print e