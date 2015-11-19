'use strict';
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var wrap = require("gulp-wrap");
var concat = require("gulp-concat");
var uncss = require('gulp-uncss');
var requireDir = require('require-dir');

var macros = require('./backend/macros')
var parsers = requireDir('./backend/parsers');
var databases = requireDir('./backend/databases');
var pointer = require('./backend/pointer');
var emailMgr = require('./backend/emailMgr')
var pageDataMgr = require('./backend/pageDataMgr')
var search = require('./backend/search')
var addsrc = require('gulp-add-src');

//production
gulp.task('uglifyJS', function() {
	return gulp.src(['frontend/js/*.js','frontend/js/modules/*.js'])
	.pipe(wrap('(function(){\n<%= contents %>\n})();'))
	.pipe(uglify())
	.pipe(concat("allthejavascript.js"))
	.pipe(gulp.dest('frontend/static/js/internal'));
});

gulp.task('watchUglifyJS', function() {
	gulp.watch(['frontend/js/*.js','frontend/js/modules/*.js'], ['uglifyJS']);
});


gulp.task('uglifyCSS', function () {
    return gulp.src('frontend/css/homepage/*.css')
        // .pipe(concat('allthecss.css'))
        .pipe(uncss({
            html: ['frontend/static/index.html']
        }))
        // .pipe(addsrc('frontend/css/all/*.css'))
        .pipe(concat('allthecss.css'))
        .pipe(gulp.dest('frontend/static/css'));
});

gulp.task('watchUglifyCSS', function() {
	gulp.watch(['frontend/css/*.css'], ['uglifyCSS']);
});




gulp.task('prod',['uglifyJS','watchUglifyJS'],function() {
	macros.SEND_EMAILS = true;
	require('./backend/server')
})





//development
gulp.task('compressJS',function  () {
	return gulp.src(['frontend/js/*.js','frontend/js/modules/*.js'])
	.pipe(wrap('(function(){\n<%= contents %>\n})();'))
	.pipe(concat("allthejavascript.js"))
	.pipe(gulp.dest('frontend/static/js/internal'));
})

gulp.task('watchCompressJS', function() {
	gulp.watch(['frontend/js/*.js','frontend/js/modules/*.js'], ['compress']);
});



gulp.task('dev',['compressJS','watchCompressJS'],function () {
	require('./backend/server')
})


//other

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