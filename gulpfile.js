'use strict';
// gulp stuff
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var wrap = require("gulp-wrap");
var concat = require("gulp-concat");
// var uncss = require('gulp-uncss');
var addsrc = require('gulp-add-src');
var streamify = require('gulp-streamify');
var flatten = require('gulp-flatten');
var angularTemplates = require('gulp-angular-templatecache')
var es = require('event-stream')
var merge = require('merge-stream')
var rename = require('gulp-rename')
var merge2 = require('merge2')
var addStream = require('add-stream');
var buildTools = require('gulp-build-tools')

// browsify stuff
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var reactify = require('reactify');
var watchify = require('watchify')
var glob = require('glob')

//other stuff
var _ = require('lodash')

// custom stuff
var macros = require('./backend/macros')
var pointer = require('./backend/pointer');
var emailMgr = require('./backend/emailMgr')
var pageDataMgr = require('./backend/pageDataMgr')
var search = require('./backend/search')

// parsers and databases
var requireDir = require('require-dir');
var parsers = requireDir('./backend/parsers');
var databases = requireDir('./backend/databases');


//this is not used atm
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

gulp.task('watchUglifyCSS', function () {
	gulp.watch(['frontend/css/*.css'], ['uglifyCSS']);
});



//javascript

//watch is allways on, to turn off (or add the option back) 
// turn fullPaths back to shouldWatch and only run bundler = watchify(bundler) is shouldWatch is true
// http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/

//another note, if you include a module that dosent exist, it will silently hang forever(?) eg (require('jdklfjdasjfkl'))
function compileJS(shouldUglify) {
	var files = glob.sync('frontend/src/**/*.js');


	var filesToProccess = [];
	if (shouldUglify) {
		files.forEach(function (file) {
			if (!_(file).includes('tests')) {
				filesToProccess.push(file)
			};
		})
	}
	else {
		filesToProccess = files;
	}
	console.log('Processing:', filesToProccess)



	var bundler = browserify({
		entries: filesToProccess
	}, {
		basedir: __dirname,
		debug: false,
		cache: {}, // required for watchify
		packageCache: {}, // required for watchify

		// required to be true only for watchify (?) but watchify works when it is off.
		//dont show C:/ryan/google drive etc in the uglified source code
		fullPaths: false
	});

	if (shouldUglify) {
		bundler.ignore('./testsMgr');
		bundler.ignore('./tests/testsMgr');
		bundler.ignore('../tests/testsMgr');
	}

	bundler = watchify(bundler)

	bundler.transform(reactify);

	var rebundle = function () {
		console.log("----Rebundling custom JS!----")
		var stream = bundler.bundle();
		
		

		stream.on('error', function (err) {
			// print the error (can replace with gulp-util)
			console.log(err.message);
			// end this stream
			this.emit('end');
		})

		// stream = stream;

		if (shouldUglify) {
			stream = stream.pipe(streamify(uglify({
				compress: {
					drop_console: true,
					// warnings: true,
					// keep_fnames: true
				}
			})));
		}
		
			//.pipe(concat('templates.js'))
			
		// var uglifiedJSStream = stream;
		
		// console.log("one:",htmlTemplates,'TWO:',stream);
		
		stream = stream.pipe(source('allthejavascript.js')).pipe(gulp.dest('./frontend/static/js/internal'))
		
		// var output = 
		console.log("----Done Rebundling custom JS!----")
		return stream;
	};

	bundler.on('update', rebundle);
	return rebundle();
}


gulp.task('copyHTML', function () {
	// return gulp
	// 	.src('./frontend/src/**/*.html')
	// 	.pipe(flatten())
	// 	.pipe(gulp.dest('./frontend/static/html'));
		
		return gulp
			.src('./frontend/src/**/*.html')
			.pipe(flatten())
			.pipe(angularTemplates({ module:'templates', standalone:true }))
			// .pipe(streamify(uglify()))
			.pipe(concat('html.js'))
			.pipe(gulp.dest('./frontend/static/js/internal'))
		// var output = es.merge(htmlTemplates,stream).pipe(source('output.js')).pipe(gulp.dest('./frontend/static/js/internal'));
		// var output = htmlTemplates.pipe(concat('html.js')).pipe(gulp.dest('./frontend/static/js/internal'));
})

gulp.task('watchCopyHTML', function () {
	gulp.watch(['frontend/src/**/*.html'], ['copyHTML']);
});



//production
gulp.task('uglifyJS', function () {
	return compileJS(true);
});



//main prod starting point
gulp.task('prod', ['uglifyJS', 'watchCopyHTML', 'copyHTML'], function () {
	macros.SEND_EMAILS = true;
	require('./backend/server')
})



//development
gulp.task('compressJS', function () {
	return compileJS(false);
});


gulp.task('dev', ['compressJS', 'watchCopyHTML', 'copyHTML'], function () {
	require('./backend/server')
})


//other

// when frontend tests work, add them here
gulp.task('tests', function () {

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



gulp.task('spider', function () {
	pageDataMgr.main()
});
