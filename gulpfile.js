'use strict';
var uglify = require('gulp-uglify');
var gulp = require('gulp');
var wrap = require("gulp-wrap");
var concat = require("gulp-concat");
var requireDir = require('require-dir');

var parsers = requireDir('./backend/parsers');
var databases = requireDir('./backend/databases');
var pointer = require('./backend/pointer');
var emailMgr = require('./backend/emailMgr')
var pageDataMgr = require('./backend/pageDataMgr')
var search = require('./backend/search')



gulp.task('uglify', function() {
	return gulp.src(['frontend/js/*.js','frontend/js/modules/*.js'])
	.pipe(wrap('(function(){\n<%= contents %>\n})();'))
	.pipe(uglify())
	.pipe(concat("allthejavascript.js"))
	.pipe(gulp.dest('frontend/static/js/internal'));
});



gulp.task('prod',['uglify'],function() {
  require('./backend/server')
})




gulp.task('compress',function  () {
	return gulp.src(['frontend/js/*.js','frontend/js/modules/*.js'])
	.pipe(wrap('(function(){\n<%= contents %>\n})();'))
	.pipe(concat("allthejavascript.js"))
	.pipe(gulp.dest('frontend/static/js/internal'));
})

gulp.task('watchCompress', function() {
  gulp.watch(['frontend/js/*.js','frontend/js/modules/*.js'], ['compress']);
});



gulp.task('dev',['compress','watchCompress'],function () {
	require('./backend/server')
})


// when frontend tests work, add them here
gulp.task('tests',function(){
	
	//run all of the parser tests
	for (var parserName in parsers) {
	  parsers[parserName].tests();
	}
	
	//run all of the db tests
	for (var databaseName in databases) {
	  databases[databaseName].tests();
	}

	pointer.tests();
	emailMgr.tests();
	pageDataMgr.tests();
	search.tests();
});

gulp.task('spider',function(){
	pageDataMgr.main()
});


// gulp.task('default',['compress','watch','prod']);