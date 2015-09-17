'use strict';
function Popup () {
	
}

//creates 7:00 - 9:00 am
// Thursday, Friday string
var weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
Popup.prototype.createTimeStrings = function(meetings) {
	
	//{startDate: 16554, endDate: 16554, profs: Array[1], where: "Snell Engineering Center 168", times: Object…}
	meetings.forEach(function (meeting) {

		var timeText = []
		// "[{"times":[{"start":46800,"end":54000}],"days":["3"]}]"
		meeting.groupedTimes.forEach(function (groupedTime) {
			groupedTime.times.forEach(function (time,index) {
				if (index>0) {
					timeText.push(', ')
				};

				timeText.push(moment.utc(time.start*1000).format('h:mm'))

				timeText.push(' - ')

				timeText.push(moment.utc(time.end*1000).format('h:mm a'))
			}.bind(this))
			
		}.bind(this))
		meeting.timeString = timeText.join('')
		meeting.dayString = ''


		for (var dayIndex in meeting.times) {
			if (!weekDays[dayIndex]) {
				console.log('error dayIndex not found?')
				meeting.dayString+='Someday'
			}
			else {
				meeting.dayString+=weekDays[dayIndex]+', '
			}
		}
		meeting.dayString = meeting.dayString.trim().replace(/,$/gi,'')
	}.bind(this))
}
Popup.prototype.calculateHoursPerWeek = function(meetings) {
	meetings.forEach(function (meeting) {
		meeting.hoursPerWeek = 0;

		for (var dayIndex in meeting.times) {
			var dayTimes = meeting.times[dayIndex]
			dayTimes.forEach(function (time) {
				//end and start are in seconds so conver them to hours
				meeting.hoursPerWeek += (time.end - time.start)/(60*60)
			}.bind(this))
		}

		meeting.hoursPerWeek = Math.round(10*meeting.hoursPerWeek)/10
	}.bind(this))
}

Popup.prototype.addTimestoGroupedTimes = function(meeting,dayIndex) {
	var times = meeting.times[dayIndex]

	for (var i = 0; i < meeting.groupedTimes.length; i++) {
		if (_.isEqual(meeting.groupedTimes[i].times,times)){
			meeting.groupedTimes[i].days.push(dayIndex)
			return;
		}
	}
	meeting.groupedTimes.push({
		times:times,
		days:[dayIndex]
	})
}

Popup.prototype.calculateExams = function(meetings) {
	meetings.forEach(function (meeting) {
		if (meeting.startDate==meeting.endDate) {
			meeting.isExam = true;
		}
		else {
			meeting.isExam = false;
		}

	}.bind(this))
};
Popup.prototype.prettyLocation = function(location) {
	if (location.toLowerCase()==='tba' || location==='') {
		return 'location undecided'
	}
	else if (location.toLowerCase()=='web online') {
		return 'Web online'

	}
	else {
		return '<a target="_blank" href="http://maps.google.com/?q='+selectors.college.element.select2('data')[0].text+' '+location.replace(/\d+\s*$/i,'')+'">'+location+'</a>';
	}
};

Popup.prototype.groupSectionTimes = function(sections) {
	//make a list of all profs
	sections.forEach(function (section) {
		if (!section.meetings) {
			return;
		}
		section.profs = []
		section.locations = []

		section.meetings.forEach(function (meeting) {


			//make a big list of all meetings prof's in the section
			meeting.profs.forEach(function (prof) {
				if (section.profs.indexOf(prof)<0) {
					section.profs.push(prof);
				};
			}.bind(this))


			if (section.locations.indexOf(meeting.where)<0) {
				section.locations.push(this.prettyLocation(meeting.where));
			};


		}.bind(this))

		//group the times by start/end time (so can put days underneath)
		// var meetingsGrouped = []
		section.meetings.forEach(function (meeting) {
			meeting.groupedTimes = [];
			for (var dayIndex in meeting.times) {
				this.addTimestoGroupedTimes(meeting,dayIndex)
			}
		}.bind(this))

		this.createTimeStrings(section.meetings)
		this.calculateHoursPerWeek(section.meetings);
		this.calculateExams(section.meetings);


		section.profs = section.profs.join(', ');
		section.locations = section.locations.join(', ');
	}.bind(this))


	//sort sections by first grouped time start time
	sections.sort(function(a,b){
		if (!a.meetings && !b.meetings) {
			return 0;
		}
		if (!a.meetings || a.meetings.length===0) {
			return 1;
		}
		if (!b.meetings || b.meetings.length===0) {
			return -1;
		}

		if (a.meetings[0].groupedTimes.length===0) {
			return 1;
		}
		if (b.meetings[0].groupedTimes.length===0) {
			return -1;
		}
		if (a.meetings[0].groupedTimes[0].times.length===0) {
			return 1;
		}
		if (b.meetings[0].groupedTimes[0].times.length===0) {
			return -1;
		}
		if (a.meetings[0].groupedTimes[0].times[0].start>b.meetings[0].groupedTimes[0].times[0].start) {
			return 1;
		}
		else if (a.meetings[0].groupedTimes[0].times[0].start<b.meetings[0].groupedTimes[0].times[0].start) {
			return -1;
		}
		else {
			return 0;
		}

	}.bind(this))
	//
	
	
	
	return sections;
}
Popup.prototype.createViewOnUrl = function(tree,url) {
	return '<a target="_blank" href="'+url+'">View on <span class="hostName">'+tree.host+'</span></a>'
}
Popup.prototype.createCreditsHTML = function(tree) {
	if (tree.minCredits!==undefined || tree.maxCredits!==undefined) {
		if (tree.minCredits===tree.maxCredits) {
			return tree.minCredits+' credit'+render.getOptionalS(tree.minCredits);
		}
		else  {
			return tree.minCredits+' to '+tree.maxCredits+' credits';
		}
	}
	return ''
}
Popup.prototype.removeSectionsNotInClass = function(tree,sections) {
	if (!tree.crns) {
		console.log('error class has no crns!!!')
		return sections
	};


	var retVal = [];
	sections.forEach(function (section) {
		if (_(tree.crns).includes(section.crn)) {
			retVal.push(section)
		};
	}.bind(this))
	return retVal;
}

Popup.prototype.expandPanel = function(tree) {
	if (tree.isString) {
		return;
	};
	if (tree.dataStatus!==treeMgr.DATASTATUS_DONE) {
		return;
	};




	tree.panel.style.zIndex = '999'
	tree.isExpanded=true;
	var panelBody = tree.panel.getElementsByClassName('panelBodyId')[0]


	//overall
	//credits
	//nofity if changes
	//update button

	//if not much details don't expand
	if ((!tree.desc || tree.desc.length<20) && (!tree.crns || tree.crns.length===0)) {
		panelBody.style.whiteSpace ='normal'
		
		
		panelBody.innerHTML+=this.createCreditsHTML(tree)


		var classURL ;
		if (tree.prettyUrl) {
			classURL = tree.prettyUrl;
		}
		else {
			classURL = tree.url;
		}
		panelBody.innerHTML += '<br><a target="_blank" href="'+classURL+'"> view on '+tree.host+'</a>'
	}
	else {
		request({
			url:'/listSections',
			type:'POST',
			body:{
				host:tree.host,
				termId:tree.termId,
				subject:tree.subject,
				classId:tree.classId
			}
		},function (err,body) {
			if (err) {
				console.log(err);
				return;
			}

			body = this.removeSectionsNotInClass(tree,body)


			//tree was minimized before server responded...
			if (!tree.isExpanded) {
				return;
			}

			var newBodyText = []
			var panelWidth = 0;

			//description box
			if (tree.desc) {
				newBodyText.push('<div style="white-space: normal;margin-bottom:10px">')
				newBodyText.push(tree.desc)
				newBodyText.push('</div>')
			};

			//credits and class url
			newBodyText.push('<div class="classInfoContainer">')

			//add credits to the left
			if (tree.minCredits!==undefined || tree.maxCredits!==undefined) {
				newBodyText.push('<div style="text-align:left;display: inline-block; position: absolute;max-width: 50%;">'+this.createCreditsHTML(tree)+'</div>')
			}

			var classURL ;
			if (tree.prettyUrl) {
				classURL = tree.prettyUrl;
			}
			else {
				classURL = tree.url;
			}

			newBodyText.push('<div style="text-align: right;display: inline-block;float:right;white-space: normal;max-width: 50%;" class="rightSectionText rightClassText">'+this.createViewOnUrl(tree,classURL)+'</div>')

			newBodyText.push('</div>')
			newBodyText.push('<div style="text-align:center">')


			var sections = this.groupSectionTimes(body);
			sections.forEach(function (section) {

				if (section.meetings) {
					panelWidth += 330
					newBodyText.push('<div style="width: 260px;" class="classSection">')

					section.meetings.forEach(function (meeting) {
						if (meeting.hoursPerWeek===0) {
							return;
						};


						if (meeting.isExam) {
							newBodyText.push( '<div style=" text-align: center;margin-bottom: 22px;">Exam<br>'+meeting.timeString+' '+moment((meeting.startDate+1)*24*60*60*1000).format('dddd MMM Do')+'<br>'+meeting.hoursPerWeek+' hours <br> '+this.prettyLocation(meeting.where)+' </div>')
						}
						else {
							newBodyText.push( '<div style=" text-align: center;margin-bottom: 22px;">'+meeting.timeString+'<br> '+meeting.dayString+' <br>'+meeting.hoursPerWeek+' hours/week <br> '+this.prettyLocation(meeting.where)+' </div>')
						}
					}.bind(this))
				}
				else {
					panelWidth += 185
					newBodyText.push('<div class="classSection">')
				}


				newBodyText.push( '<div class="lowerSectionInfo">')


				var leftBoxText;

				if (section.meetings) {
					leftBoxText = section.profs+'<br>'+section.crn
				}
				else {
					leftBoxText = section.crn
				}
				newBodyText.push( '<div style="display: inline-block;max-width: 50%;">'+leftBoxText+'</div>')

				newBodyText.push( '<div style="text-align: right;display: inline-block;float:right;white-space: normal;max-width: 50%;" class="rightSectionText"> '+section.seatsRemaining+'/'+section.seatsCapacity+' seats<br>'+this.createViewOnUrl(tree,section.url)+'</div>')

				newBodyText.push('</div>')
				newBodyText.push('</div>')


			}.bind(this))
			//
			newBodyText.push('</div>')

			panelBody.style.whiteSpace = 'initial'
			panelBody.innerHTML=newBodyText.join('');

			tree.panel.getElementsByClassName('rightSectionText')

			var elements = [].slice.call(tree.panel.getElementsByClassName('rightSectionText'))

			elements.forEach(function (element) {
				element.style.minWidth = element.getElementsByClassName('hostName')[0].offsetWidth + 'px'
			}.bind(this))
			//

			panelBody.style.marginBottom = "-10px"

			tree.panel.style.height = ''

			if (!panelWidth) {
				if (tree.desc) {
					panelWidth = tree.desc.length
				}
				else {
					panelWidth = ''
				}
			}
			else {
				panelWidth = Math.min(1000,panelWidth)
			}

			if (panelWidth<164) {
				panelWidth=250
			};


			//width + left offset
			tree.panel.style.width = panelWidth+ 'px'
			tree.panel.style.maxWidth = '890px'


			var left = tree.x - tree.panel.offsetWidth/2
			if (left<15) {
				left = 15
			};

			tree.panel.style.left = left + 'px'


			//height + top offset
			tree.panel.style.top = Math.max(tree.y - tree.panel.offsetHeight/2,$('.navbar')[0].offsetHeight+25 ) + 'px'


			//shadows are cool
			tree.panel.style.boxShadow = 'gray 0px 0px 9px'

			//show the x button
			var xButton = tree.panel.getElementsByClassName('glyphicon-remove')[0]
			xButton.style.display = ''


		}.bind(this))


		//per section
		//hours per week
		//crn
		//link
		//prof
		//location - gps coords or href this somehow?
		//meetings times
		//total seats, seats open
		//nofity if seat opens
		//update button

		//all the data in meetings
		//any other data
	}
}




Popup.prototype.go = function(tree) {
	
	if (tree.isClass) {

		tree.panel.onclick=function (event) {

			if (tree.isExpanded) {

				ga('send', {
					'hitType': 'pageview',
					'page': window.location.href+'/closePopup/'+tree.subject+'/'+tree.classId,
					'title': 'Coursepro.io'
				});

				render.resetPanel(tree);
			}
			else {

				ga('send', {
					'hitType': 'pageview',
					'page': window.location.href+'/openPopup/'+tree.subject+'/'+tree.classId,
					'title': 'Coursepro.io'
				});

				this.expandPanel(tree);
			}
		}.bind(this)
	}

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.go(subTree);
		}.bind(this));
	};
}



Popup.prototype.Popup=Popup;
window.popup = new Popup();
