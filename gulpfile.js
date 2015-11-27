'use strict';
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var wrap = require("gulp-wrap");
var concat = require("gulp-concat");
var uncss = require('gulp-uncss');
var addsrc = require('gulp-add-src');
var streamify = require('gulp-streamify');

var requireDir = require('require-dir');

var browserify = require('browserify');
var source = require('vinyl-source-stream');
var reactify = require('reactify');
var watchify = require('watchify')
var glob = require('glob')

var macros = require('./backend/macros')
var parsers = requireDir('./backend/parsers');
var databases = requireDir('./backend/databases');
var pointer = require('./backend/pointer');
var emailMgr = require('./backend/emailMgr')
var pageDataMgr = require('./backend/pageDataMgr')
var search = require('./backend/search')



//watch is allways on, to turn off (or add the option back) 
// turn fullPaths back to shouldWatch and only run bundler = watchify(bundler) is shouldWatch is true
// http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/
function compileJS(shouldUglify) {
	var files = glob.sync('frontend/js/*.js');
	var bundler = browserify({entries:files}, {
		basedir: __dirname, 
		debug: false, 
		cache: {}, // required for watchify
		packageCache: {}, // required for watchify
		fullPaths: true // required to be true only for watchify
	});

	bundler = watchify(bundler) 

	bundler.transform(reactify);

	var rebundle = function() {
		console.log("----Rebundling custom JS!----")
		var stream = bundler.bundle();

		stream = stream.pipe(source('allthejavascript.js'));

		if (shouldUglify) {
			stream=stream.pipe(streamify(uglify({
				compress: { drop_console: true }
			})));
		};

		return stream.pipe(gulp.dest('./frontend/static/js/internal'));
	};

	bundler.on('update', rebundle);
	return rebundle();
}


// gulp.task('compileJSModules', function() {
// 	return gulp.src(['frontend/js/modules/*.js'])
// 	.pipe(concat("javascriptmodules.js"))
// 	.pipe(gulp.dest('frontend/static/js/external'));
// });




//production
gulp.task('uglifyJS', function() {
	return compileJS(true);
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



//main prod starting point
gulp.task('prod',['uglifyJS','watchUglifyJS'],function() {
	macros.SEND_EMAILS = true;
	require('./backend/server')
})





//development
gulp.task('compressJS', function() {
	return compileJS(false);
});


gulp.task('dev',['compressJS'],function () {
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


