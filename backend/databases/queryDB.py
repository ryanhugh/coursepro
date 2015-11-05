import json


courses = []


while 1:
	try:
		line = raw_input()
	except:
		break
	
	if not line:
		print 'done!'
		break
	
	a=json.loads(line)
	
	if 'termId' not in a or a['termId'] != '201630':
		continue
	
	
	if not 'prereqs' in a or len(a['prereqs']['values'])==0:
		courses.append((a['subject'],a['classId'],a['name']))
		# print a['subject'],a['classId']
		continue
		
	
	if len(a['prereqs']['values'])==0:
		print a['subject'],a['classId']
		
		
courses.sort(key = lambda x:x[1])


for course in courses:
	print course[0],course[1],course[2]

# print courses
	
		
	# print a['subject'],a['classId'],'nope'
	# print
	
	# print 'prereqs' in a
	
	
	
	# exit()
	
	