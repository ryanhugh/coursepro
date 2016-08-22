'use strict';
var URI = require('urijs')
var fs = require('fs')

var ellucianBaseParser = require('../ellucianBaseParser')
var MockPageData = require('../../MockPageData')
var pointer = require('../../pointer')


it('getBaseURL', function () {
	var catagoryURL = 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_display_courses?term_in=201503&one_subj=AIRF&sel_crse_strt=2041&sel_crse_end=2041&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr='



	var classURL = 'https://prd-wlssb.temple.edu/prod8/bwckctlg.p_disp_listcrse?term_in=201503&subj_in=AIRF&crse_in=2041&schd_in=%';

	expect(ellucianBaseParser.getBaseURL(catagoryURL)).toBe('https://prd-wlssb.temple.edu/prod8/');
	expect(ellucianBaseParser.getBaseURL(classURL)).toBe('https://prd-wlssb.temple.edu/prod8/');


});


it('createClassURL', function () {


	var url = 'https://banner.uregina.ca/prod/sct/bwckctlg.p_display_courses?sel_crse_strt=&sel_crse_end=&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=&term_in=201620&one_subj=BUS';
	expect(ellucianBaseParser.createClassListUrl('https://banner.uregina.ca/prod/sct/bwckctlg.p_disp_course_detail', '201620', 'BUS')).toBe(url)

	url = 'https://banner.uregina.ca/prod/sct/bwckctlg.p_display_courses?sel_crse_strt=&sel_crse_end=&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=&term_in=201620&one_subj=EC%26I';
	expect(ellucianBaseParser.createClassListUrl('https://banner.uregina.ca/prod/sct/bwckctlg.p_disp_course_detail', '201620', 'EC&I')).toBe(url)


	url = 'https://banner.uregina.ca/prod/sct/bwckctlg.p_display_courses?sel_crse_strt=&sel_crse_end=&sel_subj=&sel_levl=&sel_schd=&sel_coll=&sel_divs=&sel_dept=&sel_attr=&term_in=201620&one_subj=EC%26I';
	expect(ellucianBaseParser.createClassListUrl('https://banner.uregina.ca/prod/sct/bwckctlg.p_disp_course_detail', '201620', 'EC&I')).toBe(url)

});


it('createCatalogUrl', function () {


	var url = 'https://banner.uregina.ca/prod/sct/bwckctlg.p_disp_course_detail?cat_term_in=201620&subj_code_in=EC%26I&crse_numb_in=050'

	var goalUrl = ellucianBaseParser.createCatalogUrl('https://banner.uregina.ca/prod/sct/bwckctlg.p_disp_course_detail', '201620', 'EC&I', '050')

	expect(new URI(url).equals(goalUrl)).toBe(true)

});

it('createClassURL', function () {


	var url = 'https://banner.uregina.ca/prod/sct/bwckctlg.p_disp_listcrse?schd_in=%&term_in=201620&subj_in=EC%26I&crse_in=050'
	var goalUrl = ellucianBaseParser.createClassURL('https://banner.uregina.ca/prod/sct/bwckctlg.p_disp_course_detail', '201620', 'EC&I', '050')
	expect(new URI(url).equals(goalUrl)).toBe(true)

});
