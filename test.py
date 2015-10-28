from datetime import datetime, time,timedelta
import urllib
import urllib2
import requests

# url = 'http://www.someserver.com/cgi-bin/register.cgi'



# url = 'https://httpbin.org/post'
# url = 'https://localhost'
url = 'https://ssb.cc.binghamton.edu/banner/bwckschd.p_get_crse_unsec'


# values = {'name' : 'Michael Foord',
#           'location' : 'Northampton',
#           'language' : 'Python' }



a = 'term_in=201590&sel_subj=dummy&sel_subj=%25&sel_subj=AAAS&sel_subj=ACCT&sel_subj=AFST&sel_subj=ANTH&sel_subj=ARAB&sel_subj=ARTH&sel_subj=ARTS&sel_subj=ASTR&sel_subj=BCHM&sel_subj=BE&sel_subj=BIOL&sel_subj=BLS&sel_subj=BME&sel_subj=CCPA&sel_subj=CDCI&sel_subj=CHEM&sel_subj=CHIN&sel_subj=CINE&sel_subj=CLAS&sel_subj=COLI&sel_subj=CQS&sel_subj=CS&sel_subj=CW&sel_subj=DDPR&sel_subj=DDP&sel_subj=ECON&sel_subj=EDUC&sel_subj=EECE&sel_subj=EGYN&sel_subj=ELED&sel_subj=ENG&sel_subj=ENT&sel_subj=ENVI&sel_subj=ERED&sel_subj=ESL&sel_subj=EVOS&sel_subj=FIN&sel_subj=FREN&sel_subj=GEOG&sel_subj=GEOL&sel_subj=GERM&sel_subj=GLST&sel_subj=GRD&sel_subj=GRK&sel_subj=HARP&sel_subj=HDEV&sel_subj=HEBR&sel_subj=HIST&sel_subj=HWS&sel_subj=IBUS&sel_subj=ISE&sel_subj=ITAL&sel_subj=JPN&sel_subj=JUST&sel_subj=KOR&sel_subj=LACS&sel_subj=LAT&sel_subj=LEAD&sel_subj=LING&sel_subj=LTRC&sel_subj=LXC&sel_subj=MATH&sel_subj=MDVL&sel_subj=ME&sel_subj=MGMT&sel_subj=MIS&sel_subj=MKTG&sel_subj=MSE&sel_subj=MSL&sel_subj=MUS&sel_subj=MUSP&sel_subj=NURS&sel_subj=OPM&sel_subj=OUT&sel_subj=PAFF&sel_subj=PERS&sel_subj=PHIL&sel_subj=PHYS&sel_subj=PIC&sel_subj=PLSC&sel_subj=PPL&sel_subj=PSYC&sel_subj=RHET&sel_subj=RLIT&sel_subj=RPHL&sel_subj=RUSS&sel_subj=SAA&sel_subj=SCHL&sel_subj=SCM&sel_subj=SEC&sel_subj=SOC&sel_subj=SPAN&sel_subj=SPED&sel_subj=SSIE&sel_subj=SW&sel_subj=THEA&sel_subj=THEP&sel_subj=TRIP&sel_subj=TURK&sel_subj=UNIV&sel_subj=WGSS&sel_subj=WRIT&sel_subj=WTSN&sel_subj=YIDD&sel_day=dummy&sel_day=m&sel_day=t&sel_day=w&sel_day=r&sel_day=f&sel_day=s&sel_day=u&sel_schd=dummy&sel_schd=%25&sel_schd=ACT&sel_schd=DIS&sel_schd=IS&sel_schd=INT&sel_schd=LEC&sel_schd=PRC&sel_schd=SEM&sel_insm=dummy&sel_insm=%25&sel_insm=DI&sel_insm=OA&sel_insm=OC&sel_insm=OH&sel_insm=OS&sel_insm=TR&sel_camp=dummy&sel_levl=dummy&sel_levl=%25&sel_levl=GD&sel_levl=UG&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_ptrm=%25&sel_ptrm=1&sel_ptrm=M1&sel_ptrm=M2&sel_ptrm=M3&sel_ptrm=M4&sel_ptrm=M5&sel_ptrm=M6&sel_ptrm=M7&sel_ptrm=M8&sel_ptrm=M9&sel_ptrm=N1&sel_ptrm=N2&sel_ptrm=N3&sel_attr=dummy&sel_attr=%25&sel_attr=A&sel_attr=B&sel_attr=C&sel_attr=FL1&sel_attr=FL2&sel_attr=FL3&sel_attr=G&sel_attr=H&sel_attr=J&sel_attr=L&sel_attr=M&sel_attr=N&sel_attr=O&sel_attr=P&sel_attr=S&sel_attr=W&sel_attr=Y&sc_sel_attr=dummy&sc_sel_attr=%25&sc_sel_attr=ASL&sc_sel_attr=CEL&begin_hh=0&begin_mi=0&begin_ap=a&end_hh=0&end_mi=0&end_ap=a';


a='term_in=201590&sel_subj=dummy&sel_day=dummy&sel_schd=dummy&sel_insm=dummy&sel_camp=dummy&sel_levl=dummy&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_attr=dummy&sc_sel_attr=dummy&sel_subj=%25&sel_subj=AAAS&sel_subj=ACCT&sel_subj=AFST&sel_subj=ANTH&sel_subj=ARAB&sel_subj=ARTH&sel_subj=ARTS&sel_subj=ASTR&sel_subj=BCHM&sel_subj=BE&sel_subj=BIOL&sel_subj=BLS&sel_subj=BME&sel_subj=CCPA&sel_subj=CDCI&sel_subj=CHEM&sel_subj=CHIN&sel_subj=CINE&sel_subj=CLAS&sel_subj=COLI&sel_subj=CQS&sel_subj=CS&sel_subj=CW&sel_subj=DDPR&sel_subj=DDP&sel_subj=ECON&sel_subj=EDUC&sel_subj=EECE&sel_subj=EGYN&sel_subj=ELED&sel_subj=ENG&sel_subj=ENT&sel_subj=ENVI&sel_subj=ERED&sel_subj=ESL&sel_subj=EVOS&sel_subj=FIN&sel_subj=FREN&sel_subj=GEOG&sel_subj=GEOL&sel_subj=GERM&sel_subj=GLST&sel_subj=GRD&sel_subj=GRK&sel_subj=HARP&sel_subj=HDEV&sel_subj=HEBR&sel_subj=HIST&sel_subj=HWS&sel_subj=IBUS&sel_subj=ISE&sel_subj=ITAL&sel_subj=JPN&sel_subj=JUST&sel_subj=KOR&sel_subj=LACS&sel_subj=LAT&sel_subj=LEAD&sel_subj=LING&sel_subj=LTRC&sel_subj=LXC&sel_subj=MATH&sel_subj=MDVL&sel_subj=ME&sel_subj=MGMT&sel_subj=MIS&sel_subj=MKTG&sel_subj=MSE&sel_subj=MSL&sel_subj=MUS&sel_subj=MUSP&sel_subj=NURS&sel_subj=OPM&sel_subj=OUT&sel_subj=PAFF&sel_subj=PERS&sel_subj=PHIL&sel_subj=PHYS&sel_subj=PIC&sel_subj=PLSC&sel_subj=PPL&sel_subj=PSYC&sel_subj=RHET&sel_subj=RLIT&sel_subj=RPHL&sel_subj=RUSS&sel_subj=SAA&sel_subj=SCHL&sel_subj=SCM&sel_subj=SEC&sel_subj=SOC&sel_subj=SPAN&sel_subj=SPED&sel_subj=SSIE&sel_subj=SW&sel_subj=THEA&sel_subj=THEP&sel_subj=TRIP&sel_subj=TURK&sel_subj=UNIV&sel_subj=WGSS&sel_subj=WRIT&sel_subj=WTSN&sel_subj=YIDD&sel_crse=&sel_title=&sel_schd=%25&sel_schd=ACT&sel_schd=DIS&sel_schd=IS&sel_schd=INT&sel_schd=LEC&sel_schd=PRC&sel_schd=SEM&sel_insm=%25&sel_insm=DI&sel_insm=OA&sel_insm=OC&sel_insm=OH&sel_insm=OS&sel_insm=TR&sel_from_cred=&sel_to_cred=&sel_levl=%25&sel_levl=GD&sel_levl=UG&sel_ptrm=%25&sel_ptrm=1&sel_ptrm=M1&sel_ptrm=M2&sel_ptrm=M3&sel_ptrm=M4&sel_ptrm=M5&sel_ptrm=M6&sel_ptrm=M7&sel_ptrm=M8&sel_ptrm=M9&sel_ptrm=N1&sel_ptrm=N2&sel_ptrm=N3&sel_attr=%25&sel_attr=A&sel_attr=B&sel_attr=C&sel_attr=FL1&sel_attr=FL2&sel_attr=FL3&sel_attr=G&sel_attr=H&sel_attr=J&sel_attr=L&sel_attr=M&sel_attr=N&sel_attr=O&sel_attr=P&sel_attr=S&sel_attr=W&sel_attr=Y&sc_sel_attr=%25&sc_sel_attr=ASL&sc_sel_attr=CEL&begin_hh=0&begin_mi=0&begin_ap=a&end_hh=0&end_mi=0&end_ap=a&sel_day=m&sel_day=t&sel_day=w&sel_day=r&sel_day=f&sel_day=s&sel_day=u'


# import requests
# import pprint
# r = requests.post(url,data=a,verify=False);
# print r.text


# a=1445136263888


# print datetime.combine(datetime.now(),time(0))
# utcnow = datetime.utcnow()
midnight_utc = datetime.combine(datetime.now(),time(0))

reqTime = datetime.fromtimestamp(1445136263888/1000)

print reqTime,midnight_utc

if reqTime>midnight_utc :
	print 'Today',
elif reqTime>(midnight_utc- timedelta(days=1)):
	print 'Yesterday',
else :
	print reqTime.strftime('%b %d %I:%M:%S %p'),
	


# pprint.pprint(r.json())


# data = urllib.urlencode(values)
# req = urllib2.Request(url, a,{ 'User-Agent' : 'Mozilla/5.0','Connection': 'keep-alive' })
# response = urllib2.urlopen(req)
# print response.read()
#