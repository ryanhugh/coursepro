module.exports = ["https://oscar.gatech.edu/pls/bprod/bwckschd.p_disp_dyn_sched", //works
  "https://wl11gp.neu.edu/udcprod8/bwckschd.p_disp_dyn_sched", //works
  "https://sisssb.clemson.edu/sisbnprd/bwckschd.p_disp_dyn_sched", //works
  "https://ssb.ccsu.edu/pls/ssb_cPROD/bwckschd.p_disp_dyn_sched", //works
  "https://ssb.cc.binghamton.edu/banner/bwckschd.p_disp_dyn_sched", //this one dosen't have this url (scroll right), figure out which parser needs this and if it would be a easy fix or naw https://ssb.cc.binghamton.edu/banner/bwckctlg.p_disp_listcrse?term_in=201510&subj_in=MDVL&crse_in=561B&schd_in=%25
  "https://tturedss1.tntech.edu/pls/PROD/bwckschd.p_disp_dyn_sched", //ran with bingham, and only got 1 term and 0 subjects... idk. will finish quick if ran again probably. Ran again in Aug 2016 and it looks like the term farthest in the future is added, but dosen't have any subjects. Other terms are valid. 
  "https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_dyn_sched", //takes 3 hours and prereqs are not parsed correcly, but everything else works
  "https://bannerweb.upstate.edu/isis/bwckschd.p_disp_dyn_sched", //works
  "https://ssb.banner.usu.edu/zprod/bwckschd.p_disp_dyn_sched", //works
  "https://ssbprod11g.uncfsu.edu/pls/FSUPROD/bwckschd.p_disp_dyn_sched", // down atm?? down march 10, 2016. ports 80 and 443 closed, others filtered. looks like firewall still up but app down.
  "https://banner.uregina.ca/prod/sct/bwckschd.p_disp_dyn_sched", //takes 3 hours, works
  "https://banners.presby.edu/prod/bwckschd.p_disp_dyn_sched", // takes like 22 min, works
  "https://eagles.tamut.edu/texp/bwckschd.p_disp_dyn_sched", // collegeName capilization bug (fixed) and one subject dosent have any results, but works
  "https://ssb.sju.edu/pls/PRODSSB/bwckschd.p_disp_dyn_sched", //works
  "https://sail.oakland.edu/PROD/bwckschd.p_disp_dyn_sched", //works, takes 3 hours
  "https://genisys.regent.edu/pls/prod/bwckschd.p_disp_dyn_sched",
  "https://bappas2.gram.edu:9000/pls/gram/bwckschd.p_disp_dyn_sched", //dosent work in nodejs!!!!??? works in python, browser, etc
  "https://sail.oakland.edu/PROD/bwckschd.p_disp_dyn_sched",
  "https://banweb.wm.edu/pls/PROD/bwckschd.p_disp_dyn_sched",
  "https://prod-ssb-01.dccc.edu/PROD/bwckschd.p_disp_dyn_sched",
  "https://selfservice.mypurdue.purdue.edu/prod/bwckschd.p_disp_dyn_sched",
  "https://xbss-prod.lasalle.edu/PROD/bwckschd.p_disp_dyn_sched",
  "https://hofstraonline.hofstra.edu/pls/HPRO/bwckschd.p_disp_dyn_sched",
  "https://myswat.swarthmore.edu/pls/bwckschd.p_disp_dyn_sched",
  "https://lewisweb.cc.lehigh.edu/PROD/bwckschd.p_disp_dyn_sched",
  "https://myweb.du.edu/mdb/bwckschd.p_disp_dyn_sched",
  "https://ssbprod.rcgc.edu:9000/prod_ssb/bwckschd.p_disp_dyn_sched", // school aparently changed their hostname, it was gcc-ssbprod.gccnj.edu and now for the old domain dns fails now, wayback machine has it working in 2015: https://web.archive.org/web/20150316171359/https://gcc-ssbprod.gccnj.edu:9000/prod_ssb/bwckschd.p_disp_dyn_sched
  "https://pssb.stockton.edu/prod/bwckschd.p_disp_dyn_sched", //was port 9000, now is 443
  "https://jweb.kettering.edu/cku1/bwckschd.p_disp_dyn_sched",
  "https://www8.unm.edu/pls/banp/bwckschd.p_disp_dyn_sched",
  "https://banssbprod.xavier.edu:8099/PROD/bwckschd.p_disp_dyn_sched",
  "https://appprod.udayton.edu:9000/prod/bwckschd.p_disp_dyn_sched",
  "https://ui2web4.apps.uillinois.edu/BANPROD4/bwckschd.p_disp_dyn_sched",
  "https://lpar2.jsu.edu/DADNormalPRO8/bwckschd.p_disp_dyn_sched",
  "https://ssb.isu.edu/bprod/bwckschd.p_disp_dyn_sched",
  "https://ssb.columbiastate.edu/PROD/bwckschd.p_disp_dyn_sched/",
  "https://selfservice.brown.edu/ss/bwckschd.p_disp_dyn_sched",
  "https://ssbprod.wichita.edu/PROD/bwckschd.p_disp_dyn_sched",
  "https://prodssb.mscc.edu/PROD/bwckschd.p_disp_dyn_sched",
  "https://ssbprod11g.uncfsu.edu/pls/FSUPROD/bwckschd.p_disp_dyn_sched",
  "https://banner4.utm.edu/prod/bwckschd.p_disp_dyn_sched",
  "https://nssb-p.adm.fit.edu/prod/bwckschd.p_disp_dyn_sched",
  "https://prodssb.ws.edu/pls/PROD/bwckschd.p_disp_dyn_sched",
  "https://oasis.farmingdale.edu/banner/bwckschd.p_disp_dyn_sched",
  "https://oxford.blinn.edu:9010/PROD/bwckschd.p_disp_dyn_sched",
  "https://ssb.ship.edu/prod/bwckschd.p_disp_dyn_sched",
  "https://telaris.wlu.ca/ssb_prod/bwckschd.p_disp_dyn_sched",
  "https://www2.augustatech.edu/pls/ban8/bwckschd.p_disp_dyn_sched",
  "https://banner.drexel.edu/pls/duprod/bwckschd.p_disp_dyn_sched",
  "https://infobear.bridgew.edu/BANP/bwckschd.p_disp_dyn_sched",
  "https://new-sis-app.sph.harvard.edu:9010/prod/bwckschd.p_disp_dyn_sched"
]


// non -ellucian sites
// harvard https://courses.harvard.edu/search?sort=course_title+asc&start=0&submit=Search&rows=500000&q=0
// if you remove the q param from the url, 15000+ courses come up, but cs50 is not one of those. If you search for cs50, it comes up. how to get all classes?

//mit http://student.mit.edu/catalog/extsearch.cgi



// https://banners.presby.edu/prod/hzskschd.P_ViewSchedule
// uses an old version of the site - different parser needed (easy to write, add later)
// this specific college ^ either updated or has a newer version too and has already been scraped



