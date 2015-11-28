'use strict';


//used just to define constance used mostly in treeMgr, also in render.js

function Macros () {


	//states of trees
	this.DATASTATUS_NOTSTARTED = 0;
	this.DATASTATUS_LOADING = 1;
	this.DATASTATUS_DONE = 2;
	this.DATASTATUS_FAIL = 3;

}






Macros.prototype.Macros=Macros;
module.exports = new Macros();
