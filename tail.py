import json
import re

while 1:
		try:
			a= raw_input()
		except:
			exit()
		if not a:
				exit()
		try:
				b= json.loads(a)
		except:
				print a
				continue
		if 'userId' in b['body']:
				b['body']['userId']=re.sub('[\W_]', '',b['body']['userId'])[0:5]

		ref = ''
		if 'referer' in b and 'coursepro.io' not in b['referer']:
				print b['referer'],
		print b['ip'],' ',b['url'],b['body']

