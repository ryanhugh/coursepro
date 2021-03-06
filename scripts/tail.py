import json
import re
from datetime import datetime, time,timedelta
import exceptions
import sys
import re


# This processes the logs that are logged by server.js


def getInput():
	try:
		a= raw_input()
	except exceptions.EOFError:
		sys.exit()
	except Exception as e:
		print e.type
		sys.exit()
		
	# if not a:
	# 	print 'EXITING'
	# 	exit()
		
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
	

def shouldIgnoreReferrer(currRef):

	if re.match('https?://(?:\w+.)?coursepro.io/',currRef) or 'ryanhugh.github.io' in currRef:
		return True
	return False

def main():
	line = getInput()
	if not line:
		return
	
	# print line
	if line['method'] not in ['GET','POST'] and 'ryanhugh.github.io' in line['referer']:
		return;
	
	if line['method'] =='POST' and 'userId' in line['body']:
	
		line['body']['userId']=re.sub(r'[\W_]', '',line['body']['userId'])[0:5]
		
		
	
	line['time'] = getTimeString(line['time'])
	
	
	if 'referer' in line and not shouldIgnoreReferrer(line['referer']) and not 'msg' in line:
		print line['referer']

	line['ip'] = line['ip'].replace('::ffff:','')
	
	#print ip
	print '%15s' % line['ip'],
	
	if 'userId' in line['body']:
		print '%05s' % line['body']['userId'],
	else :
		print ' '*5,
		
	
	print line['time'],
	
	if 'msg' in line:
		line['url'] = line['url'][:15]
	print '%-15s' % line['url'],



	print ' ',
	if 'host' in line['body']:
		sys.stdout.write(str(line['body']['host'])+'/')
	if 'termId' in line['body']:
		sys.stdout.write(str(line['body']['termId'])+'/')
	if 'subject' in line['body']:
		sys.stdout.write(str(line['body']['subject'])+'/')
	if 'classId' in line['body']:
		sys.stdout.write(str(line['body']['classId'])+'/')

	if 'text' in line['body']:
		sys.stdout.write(line['body']['text']+' ')
		
	if 'url' in line['body']:
		sys.stdout.write(line['body']['url']+' ')

	if 'type' in line['body'] and line['body']['type']=='addToList':
		print 'saved classes Old Classes:'+str(line['body']['initClassCount']),'Sections:',str(line['body']['initSectionCount']),'New Classes:',str(line['body']['finalClassCount']),'Sections: ',str(line['body']['finalSectionCount']),
		
	if 'type' in line['body'] and line['body']['type'] == 'employee_search':
		print 'Employee search: ',line['body']['value'], line['body']['count']
		return
		
		
	print ' ',
	
	if 'msg' in line:
		print line['msg']['summary'],
		
	else:
			
		if 'email' in line['body']:
			sys.stdout.write(line['body']['email'])
		
				
		if 'searchQuery' in line['body']:
			print 'search for "'+line['body']['searchQuery']+'"',
		
		if 'type' in line['body'] and line['body']['type']=='createTree':
			print 'render tree',
		
		if 'classCount' in line['body']:
			print ' -> ',line['body']['classCount'],
			
			
		if line['method'] not in ['GET','POST']:
			print '',line['method'],'Request',
			if 'userAgent' in line and line['userAgent']:
				print ' -> ',line['userAgent'][:70],
				
		if line['method']=='POST' and 'userId' not in line['body']:
			print 'no userId!',
			
			if 'userAgent' in line and line['userAgent']:
				print ' -> ',line['userAgent'][:70],
	

	print


while 1:
	
	try:
		main()
	except Exception as e:
		print 'EXCEPTION!'
		print e