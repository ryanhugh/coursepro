import json
import re
import datetime

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

                if 'searchTerm' in b:
                        print 'Search for','"'+b['searchTerm']+'"',':',b['count']
                        continue


                if 'userId' in b['body']:
                                b['body']['userId']=re.sub(r'[\W_]', '',b['body']['userId'])[0:5]

                ref = ''
                if 'referer' in b and 'coursepro.io' not in b['referer']:
                                print b['referer'],
                print b['ip'],datetime.datetime.fromtimestamp(int(b['time'])/1000).ctime(),' ',b['url'],b['body']
