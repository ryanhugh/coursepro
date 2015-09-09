'use strict';
function Popup () {
	
}

//creates 7:00 - 9:00 am
// Thursday, Friday string
var weekDays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saterday']
Popup.prototype.createTimeStrings = function(meetingsGrouped) {
	
	meetingsGrouped.forEach(function (groupedTime) {
		
		var timeText = []
		groupedTime.times.forEach(function (time,index) {
			if (index>0) {
				timeText.push(', ')
			};

			timeText.push(moment.utc(time.start*1000).format('h:mm'))

			timeText.push(' - ')

			timeText.push(moment.utc(time.end*1000).format('h:mm a'))
			
		}.bind(this))
		groupedTime.timeString = timeText.join('')
		groupedTime.dayString = _.map(groupedTime.days,function (dayIndex) {
			if (!weekDays[dayIndex]) {
				console.log('error dayIndex not found?')
				return 'Someday'
			};

			return weekDays[dayIndex];
		}).join(', ');
	}.bind(this))
}
Popup.prototype.calculateHoursPerWeek = function(meetingsGrouped) {
	meetingsGrouped.forEach(function (meeting) {

		meeting.hoursPerWeek = 0;

		//figure out how many hours each day they meet
		meeting.times.forEach(function (dayTime) {

			//end and start are in seconds so conver them to hours
			meeting.hoursPerWeek += (dayTime.end - dayTime.start)/(60*60)
		}.bind(this))
		//and multiply by number of days that they meet
		meeting.hoursPerWeek *= meeting.days.length

		meeting.hoursPerWeek = Math.round(10*meeting.hoursPerWeek)/10
	}.bind(this))
}

Popup.prototype.addTimestoGroupedTimes = function(meetingsGrouped,dayIndex,meeting) {
	var times = meeting.times[dayIndex]


	for (var i = 0; i < meetingsGrouped.length; i++) {
		if (_.isEqual(meetingsGrouped[i].times,times)){
			meetingsGrouped[i].days.push(dayIndex)
			// meetingsGrouped[i].dayString+=', '+weekDays[dayIndex]
			return;
		}
	}
	// debugger;

	var meetingClone = _.cloneDeep(meeting);
	meetingClone.days = [dayIndex];

	meetingsGrouped.push(meetingClone);
}

Popup.prototype.calculateExams = function(meetingsGrouped) {
	meetingsGrouped.forEach(function (meeting) {
		// debugger;
		//if only meets once, show that 
		//usally exams, but some colleges have like classes every other week which will
		//proc this too
		if (meeting.startDate==meeting.endDate) {
			meeting.isExam = true;
		}
		else {
			meeting.isExam = false;
		}

	}.bind(this))
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
				if (meeting.where.toLowerCase()==='tba' || meeting.where==='') {
					if (section.locations.length===0) {
						section.locations.push('location undecided');
					};
				}
				else if (meeting.where.toLowerCase()=='web online') {
					section.locations.push('Web online');
				}
				else {
					section.locations.push('<a target="_blank" href="http://maps.google.com/?q='+selectors.selectCollegeElement.select2('data')[0].text+' '+meeting.where.replace(/\d+\s*$/i,'')+'">'+meeting.where+'</a>');
				}
			};


		}.bind(this))

		//group the times by start/end time (so can put days underneath)
		var meetingsGrouped = []
		section.meetings.forEach(function (meeting) {
			for (var dayIndex in meeting.times) {
				this.addTimestoGroupedTimes(meetingsGrouped,dayIndex,meeting)
			}
		}.bind(this))

		this.createTimeStrings(meetingsGrouped)
		this.calculateHoursPerWeek(meetingsGrouped);
		this.calculateExams(meetingsGrouped);


		section.meetingsGrouped = meetingsGrouped;
		section.profs = section.profs.join(', ');
		section.locations = section.locations.join(', ');
	}.bind(this))
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
			body:JSON.stringify({
				host:tree.host,
				termId:tree.termId,
				subject:tree.subject,
				classId:tree.classId
			})
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

					section.meetingsGrouped.forEach(function (meeting) {
						if (meeting.isExam) {
							newBodyText.push( '<div style=" text-align: center;margin-bottom: 22px;">Exam<br>'+meeting.timeString+' date here'+'<br> '+meeting.dayString+' <br> '+meeting.hoursPerWeek+' hours </div>')
						}
						else {
							newBodyText.push( '<div style=" text-align: center;margin-bottom: 22px;">'+meeting.timeString+'<br> '+meeting.dayString+' <br> '+meeting.hoursPerWeek+' hours/week </div>')
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
					leftBoxText = section.profs+'<br>'+section.locations+'<br>'+section.crn
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
				panelWidth = ''
			}
			else {
				panelWidth = Math.min(1000,panelWidth) + 'px'
			}


			//width + left offset
			tree.panel.style.width = panelWidth
			tree.panel.style.maxWidth = '890px'
			tree.panel.style.left = (tree.x - tree.panel.offsetWidth/2 ) + 'px'


			//height + top offset
			tree.panel.style.top = Math.max(tree.y - tree.panel.offsetHeight/2,$('.navbar')[0].offsetHeight+25 ) + 'px'


			//shadows are cool 
			tree.panel.style.boxShadow = 'gray 0px 0px 9px'


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




Popup.prototype.addPopups = function(tree) {
	
	if (tree.isClass) {

		tree.panel.onclick=function (event) {
			if (tree.isExpanded) {
				render.resetPanel(tree);
			}
			else {
				this.expandPanel(tree);
			}
		}.bind(this)
	}

	if (tree.values) {
		tree.values.forEach(function (subTree) {
			this.addPopups(subTree);
		}.bind(this));
	};
}

Popup.prototype.go = function(tree) {
	this.tree = tree;
};

Popup.prototype.Popup=Popup;
window.popup = new Popup();
