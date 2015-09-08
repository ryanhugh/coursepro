'use strict';
function Popup () {
	
}


Popup.prototype.addTimestoGroupedTimes = function(meetingsGrouped,dayIndex,times) {
	for (var i = 0; i < meetingsGrouped.length; i++) {
		if (_.isEqual(meetingsGrouped[i].times,times)){
			meetingsGrouped[i].days.push(dayIndex)
			meetingsGrouped[i].dayString+=', '+weekDays[dayIndex]
			return;
		}
	}

	meetingsGrouped.push({
		times:times,
		days:[dayIndex],
	})
}


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
Popup.prototype.groupSectionTimes = function(body) {
	//make a list of all profs
	body.forEach(function (section) {
		if (section.meetings) {

			var profs = []
			var locations = []
			section.meetings.forEach(function (meeting) {

				meeting.profs.forEach(function (prof) {
					if (profs.indexOf(prof)<0) {
						profs.push(prof);
					};
				}.bind(this))

				if (locations.indexOf(meeting.where)<0) {
					if (meeting.where.toLowerCase()==='tba' || meeting.where==='') {
						if (locations.length===0) {
							locations.push('location undecided');
						};
					}
					else if (meeting.where.toLowerCase()=='web online') {
						locations.push('Web online');

					}
					else {
						locations.push('<a target="_blank" href="http://maps.google.com/?q='+selectors.selectCollegeElement.select2('data')[0].text+' '+meeting.where.replace(/\d+\s*$/i,'')+'">'+meeting.where+'</a>');
					}

				};


			}.bind(this))

			//group the times by start/end time (so can put days underneath)
			var meetingsGrouped = []
			section.meetings.forEach(function (meeting) {
				for (var dayIndex in meeting.times) {
					this.addTimestoGroupedTimes(meetingsGrouped,dayIndex,meeting.times[dayIndex])
				}
			}.bind(this))
			this.createTimeStrings(meetingsGrouped)
			this.calculateHoursPerWeek(meetingsGrouped);


			section.times = meetingsGrouped;
			section.profs = profs.join(', ');
			section.locations = locations.join(', ');
			
		};
	}.bind(this))
	return body;
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

Popup.prototype.expandPanel = function(item) {
	if (item.isString) {
		return;
	};
	if (item.dataStatus!==treeMgr.DATASTATUS_DONE) {
		return;
	};


	item.panel.style.zIndex = '999'
	item.isExpanded=true;
	var panelBody = item.panel.getElementsByClassName('panelBodyId')[0]


	//overall
	//credits
	//nofity if changes
	//update button

	//if not much details don't expand
	if ((!item.desc || item.desc.length<20) && (!item.crns || item.crns.length===0)) {
		panelBody.style.whiteSpace ='normal'
		
		
		panelBody.innerHTML+=this.createCreditsHTML(item)


		var classURL ;
		if (item.prettyUrl) {
			classURL = item.prettyUrl;
		}
		else {
			classURL = item.url;
		}
		panelBody.innerHTML += '<br><a target="_blank" href="'+classURL+'"> view on '+item.host+'</a>'
	}
	else {
		request({
			url:'/listSections',
			type:'POST',
			body:JSON.stringify({
				host:item.host,
				termId:item.termId,
				subject:item.subject,
				classId:item.classId
			})
		},function (err,body) {
			if (err) {
				console.log(err);
				return;
			}

			body = this.removeSectionsNotInClass(item,body)


			//item was minimized before server responded...
			if (!item.isExpanded) {
				return;
			}

			var newBodyText = []
			var panelWidth = 0;

			//description box
			if (item.desc) {
				newBodyText.push('<div style="white-space: normal;margin-bottom:10px">')
				newBodyText.push(item.desc)
				newBodyText.push('</div>')
			};

			//credits and class url
			newBodyText.push('<div class="classInfoContainer">')

			//add credits to the left
			if (item.minCredits!==undefined || item.maxCredits!==undefined) {
				newBodyText.push('<div style="text-align:left;display: inline-block; position: absolute;max-width: 50%;">'+this.createCreditsHTML(item)+'</div>')				
			}

			var classURL ;
			if (item.prettyUrl) {
				classURL = item.prettyUrl;
			}
			else {
				classURL = item.url;
			}

			newBodyText.push('<div style="text-align: right;display: inline-block;float:right;white-space: normal;max-width: 50%;" class="rightSectionText rightClassText">'+this.createViewOnUrl(item,classURL)+'</div>')

			newBodyText.push('</div>')
			newBodyText.push('<div style="text-align:center">')


			var sections = this.groupSectionTimes(body);
			sections.forEach(function (section) {

				if (section.meetings) {
					panelWidth += 330
					newBodyText.push('<div style="width: 260px;" class="classSection">')
				}
				else {
					panelWidth += 185
					newBodyText.push('<div class="classSection">')
				}


				if (section.meetings) {
					section.times.forEach(function (time) {
						newBodyText.push( '<div style=" text-align: center;margin-bottom: 22px;">'+time.timeString+'<br> '+time.dayString+' <br> '+time.hoursPerWeek+' hours/week </div>')
					}.bind(this))
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

				newBodyText.push( '<div style="text-align: right;display: inline-block;float:right;white-space: normal;max-width: 50%;" class="rightSectionText"> '+section.seatsRemaining+'/'+section.seatsCapacity+' seats<br>'+this.createViewOnUrl(item,section.url)+'</div></div>')

				newBodyText.push('</div>')
			}.bind(this))
			//
			newBodyText.push('</div>')

			panelBody.style.whiteSpace = 'initial'
			panelBody.innerHTML=newBodyText.join('');

			item.panel.getElementsByClassName('rightSectionText')

			var elements = [].slice.call(item.panel.getElementsByClassName('rightSectionText'))

			elements.forEach(function (element) {
				element.style.minWidth = element.getElementsByClassName('hostName')[0].offsetWidth + 'px'
			}.bind(this))
			//

			panelBody.style.marginBottom = "-10px"

			item.panel.style.height = ''

			if (!panelWidth) {
				panelWidth = ''
			}
			else {
				panelWidth = Math.min(1000,panelWidth) + 'px'
			}


			//width + left offset
			item.panel.style.width = panelWidth
			item.panel.style.maxWidth = '890px'
			item.panel.style.left = (item.x - item.panel.offsetWidth/2 ) + 'px'


			//height + top offset
			item.panel.style.top = Math.max(item.y - item.panel.offsetHeight/2,$('.navbar')[0].offsetHeight+25 ) + 'px'


			//shadows are cool 
			item.panel.style.boxShadow = 'gray 0px 0px 9px'


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



Popup.prototype.Popup=Popup;
window.popup = new Popup();
