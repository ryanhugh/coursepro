'use strict';
// var require = require('./lazyRequire')

// gulp stuff
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var wrap = require("gulp-wrap");
var concat = require("gulp-concat");
var streamify = require('gulp-streamify');
var flatten = require('gulp-flatten');
var angularTemplates = require('gulp-angular-templatecache')
var htmlmin = require('gulp-htmlmin');
var notify = require("gulp-notify");

// for backend unit tests
var jasmineReporter = require('./backend/jasmineReporter')
var jasmine = require('gulp-jasmine');

// browsify stuff
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var watchify = require('watchify')
var glob = require('glob')
var karma = require('karma')

//other stuff
var _ = require('lodash')
var path = require('path')



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


function onError(err) {

	if (!err.message) {
		err = {
			message:err
		} 
	}


	// print the error (can replace with gulp-util)
	console.log(err.message);
	if (err.stack) {
		console.log(err.stack);
	}
	notify.onError({
		message: 'Error: <%= error.message %>',
		sound: false // deactivate sound?
	})(err);
}

//javascript

//watch is allways on, to turn off (or add the option back) 
// turn fullPaths back to shouldWatch and only run bundler = watchify(bundler) is shouldWatch is true
// http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/

//another note, if you include a module that dosent exist, it will silently hang forever(?) eg (require('jdklfjdasjfkl'))
function compileJS(shouldUglify) {
	var files = glob.sync('frontend/src/**/*.js');


	var filesToProccess = [];
	files.forEach(function (file) {
		if (!_(file).includes('tests')) {
			filesToProccess.push(file)
		};
	})

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


	bundler = watchify(bundler)

	var rebundle = function () {
		console.log("----Rebundling custom JS!----")
		var stream = bundler.bundle();



		stream.on('error', function (err) {
			onError(err);
			// end this stream
			this.emit('end');
		})

		stream = stream.pipe(source('allthejavascript.js'));

		if (shouldUglify) {
			stream = stream.pipe(streamify(uglify({
				options: {
					ie_proof: false
				},
				compress: {
					drop_console: true,
					unsafe: true,
					collapse_vars: true,
					pure_getters: true,
					// warnings: true,
					// keep_fnames: true
				}
			})));
		}

		stream = stream.pipe(gulp.dest('./frontend/static/js/internal'));

		stream.on('end', function () {
			console.log("----Done Rebundling custom JS!----")
		}.bind(this))

		return stream;
	};

	bundler.on('update', rebundle);
	return rebundle();
}


gulp.task('copyHTML', function () {
	return gulp
		.src('./frontend/src/**/*.html')
		.pipe(flatten())
		// .pipe(rename({
		// 	dirname:'html'
		// }))
		.pipe(htmlmin({
			collapseWhitespace: true,
			removeComments: true
		}))
		.pipe(angularTemplates({
			module: 'templates',
			standalone: true
		}))
		.pipe(concat('html.js'))
		.pipe(gulp.dest('./frontend/static/js/internal'))
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
	require('./backend/server')
})



//development
gulp.task('compressJS', function () {
	return compileJS(false);
});


gulp.task('dev', ['compressJS', 'watchCopyHTML', 'copyHTML'], function () {
	require('./backend/server')
})




gulp.task('ftest', ['watchCopyHTML', 'copyHTML'], function () {
	new karma.Server({
		configFile: __dirname + '/frontend/karma.conf.js',
	}, function (exitCode) {
		console.log('ERROR Karma has exited with ' + exitCode)
		onError('KARMA has crashed!!!!');
		process.exit()
	}.bind(this)).start();
});



// if u want to u can run individual test files with
// jasmine-node ellucianSectionParser.tests.js  --matchall
// also don't compare pageDatas directly with expect(pageData).toEqual, it will cause jasmine to eat up all yo ram and crash
gulp.task('btestRun', function () {
	var files = glob.sync('backend/**/*.js');

	files.forEach(function (file) {
		var filePath = path.resolve(file);
		delete require.cache[filePath]
	}.bind(this))

	// gulp-jasmine works on filepaths so you can't have any plugins before it 
	gulp.src('backend/**/*.tests.js')

	.pipe(jasmine({
		reporter: new jasmineReporter()
	}))
	.on('error', function (err) {
		onError(err);
		this.emit('end');
	})
});

gulp.task('btest', ['btestRun'], function () {
	gulp.watch(['backend/**/*.js'], ['btestRun']);
});

gulp.task('test', ['btest','ftest'], function () {
});



// when spider is running, it is the only thing that could be updating that college at that time
gulp.task('spider', function () {
	require('./backend/pageDataMgr').main()
});
