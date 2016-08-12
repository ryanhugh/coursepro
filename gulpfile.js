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
var addsrc = require('gulp-add-src');
var replace = require('gulp-replace');
var iife = require("gulp-iife");


// for backend unit tests
var batch = require('gulp-batch');
var JasmineReporter = require('./backend/jasmineReporter')
var Jasmine = require('jasmine');


// browsify stuff
var recursiveDeps = require('recursive-deps');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var watchify = require('watchify')
var glob = require('glob')
var karma = require('karma')
var cssnano = require('gulp-cssnano');
// var cleanCSS = require('gulp-clean-css'); 

//other stuff
var _ = require('lodash')
var path = require('path')
var queue = require('d3-queue').queue;
var fs = require('fs-extra')
var memoize = require('./memoize')
var macros = require('./backend/macros')

var KARMA_CONFIG = {
	files: [
		"dist/js/vender.tests.js",
		"dist/js/app.tests.js",
		"dist/js/html.js",
		"dist/css/allthecss.css",
	],
	plugins: [
		'karma-chrome-launcher',
		'karma-phantomjs-launcher',
		'karma-jasmine',
		'karma-logcapture-reporter',
		'karma-mocha-reporter',
	],
	frameworks: ['jasmine'],
	preprocessors: {},
	browsers: ['PhantomJS'],
	reporters: ['logcapture', 'progress', 'mocha'],
	client: {
		captureConsole: true
	},
	// reporters: ['spec'],
	specReporter: {
		maxLogLines: 8, // limit number of lines logged per test 
		suppressErrorSummary: true, // do not print error summary 
		suppressFailed: true, // do not print information about failed tests 
		suppressPassed: true, // do not print information about passed tests 
		suppressSkipped: true, // do not print information about skipped tests 
		showSpecTiming: false // print the time elapsed for each spec 
	},
	mochaReporter: {
		output: 'minimal'
	},
}



var UGLIFY_JS_CONFIG = {
	drop_console: true,
	unsafe: true,
	collapse_vars: true,
	pure_getters: true,
	unused: true,
	collapse_vars: true,
	// keep_fnames: true
}

// Old code from before that isn't used anymore
// Most of these warnings are also optimizations that uglify 
// was able to fix, aka variable only used once, so it was skipped.
// There aren't any warnings about undefined variables, etc.
// if (!compileRequire) {
// 	compressOptions.warnings = true;
// }


process.on('uncaughtException', function (err) {
	onError('Restart gulp' + err)
});


//this is not used now. 
// This searches the html for used css rules and removes the ones it cant find
// It can easily remove too many, especially when a angular/js is used to dynamically add classes
// Use with caution. 
gulp.task('uglifyCSS', function () {
	return gulp.src('frontend/css/homepage/*.css')
		// .pipe(concat('allthecss.css'))
		.pipe(uncss({
			html: ['dist/index.html']
		}))
		// .pipe(addsrc('frontend/css/all/*.css'))
		.pipe(concat('allthecss.css'))
		.pipe(gulp.dest('dist/css'));
});

gulp.task('watchUglifyCSS', function () {
	gulp.watch(['frontend/css/*.css'], ['uglifyCSS']);
});


function injectMacros(stream) {
	for (var attrName in macros) {
		stream = stream.pipe(replace('macros.' + attrName, String(macros[attrName]), {
			skipBinary: true
		}))
	}
	return stream;
}

function onError(error) {

	if (!error.message) {
		error = {
			message: error
		}
	}


	// print the erroror (can replace with gulp-util)
	console.log(error.message);
	if (error.stack) {
		console.log(error.stack);
	}
	notify.onError({
		message: 'Error: ' + error.message,
		sound: false // deactivate sound?
	})(error);
}

// This assumes that the list of files never changes.
// Support for adding/removing files would need some stuff to change in compileJS(how much?) and 
// this fn would have to change a bit too
var getFilesToProcess = memoize(function (includeTests, callback) {

	glob('frontend/js/**/*.js', function (err, files) {
		if (err) {
			return callback(err)
		}
		if (includeTests) {
			return callback(null, files);
		}

		var filesToProccess = [];

		files.forEach(function (file) {
			if (!_(file).includes('tests')) {
				filesToProccess.push(file)
			};
		})

		return callback(null, filesToProccess)
	});
})

//watch is allways on, to turn off (or add the option back) 
// turn fullPaths back to shouldWatch and only run bundler = watchify(bundler) is shouldWatch is true
// http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/
function compileJSBundle(shouldUglify, includeTests, compileRequire, callback) {
	if (compileRequire === undefined) {
		compileRequire = false;
	}


	getFilesToProcess(includeTests, function (err, filesToProccess) {
		if (err) {
			return callback(err)
		}

		recursiveDeps(filesToProccess).then(function (dependencies) {


			var node_module_dependencies = [];
			dependencies.forEach(function (dep) {
				if (!path.isAbsolute(dep)) {
					node_module_dependencies.push(dep)
				}
			})
			if (compileRequire) {
				console.log(node_module_dependencies);
			}
			else {
				console.log(filesToProccess);
			}

			if (compileRequire) {
				filesToProccess = [];
			}


			var bundler = browserify({
				entries: filesToProccess,
				bundleExternal: false,
			}, {
				basedir: __dirname,
				debug: false,
				cache: {}, // required for watchify
				packageCache: {}, // required for watchify

				// required to be true only for watchify (?) but watchify works when it is off.
				//dont show C:/ryan/google drive etc in the uglified source code
				fullPaths: false,
			});


			bundler = watchify(bundler)
			if (compileRequire) {
				bundler = bundler.require(node_module_dependencies)
			}
			else {
				bundler = bundler.external(node_module_dependencies)
			}

			// These names are hardcoded into index.html and into the KARMA_CONFIG at the top of this file
			// and maybe in server.js
			var name = '';
			if (compileRequire) {
				if (includeTests) {
					name = 'vender.tests.js'
				}
				else {
					name = 'vender.js'
				}
			}
			else {
				if (includeTests) {
					name = 'app.tests.js'
				}
				else {
					name = 'app.js'
				}
			}
			var timers = {};

			var rebundle = function () {
				timers[name] = new Date()

				console.log("----Bundling " + name + "!----")
				var stream = bundler.bundle();



				stream.on('error', function (err) {
					onError(err);
					// end this stream
					this.emit('end');
				})


				stream = stream.pipe(source(name));


				if (shouldUglify) {
					stream = stream.pipe(streamify(uglify({
						options: {
							ie_proof: false
						},
						compress: UGLIFY_JS_CONFIG
					})));
				}

				// This adds about 30-40 ms, would benefit a lot from some memoize stream things
				stream = injectMacros(stream)

				stream = stream.pipe(gulp.dest('./dist/js'));

				stream.on('end', function () {

					console.log("----Done Bundling " + name + " (" + (new Date() - timers[name]) + " ms) !----")
					callback();
				})
			};

			bundler.on('update', rebundle);
			rebundle();
		}).catch(function (err) {
			// console.log('recursiveDeps FAILED!', err,JSON.stringify(err),arguments)
			onError(err)
			if (err) {
				console.log(err.stack);
			}
		});
	});
}

function compileJS(uglifyJS, includeTests, callback) {
	var q = queue();

	q.defer(function (callback) {
		compileJSBundle(uglifyJS, includeTests, true, callback);
	});

	q.defer(function (callback) {
		compileJSBundle(uglifyJS, includeTests, false, callback);
	});

	q.awaitAll(function (err) {
		callback(err)
	})
}


//production
gulp.task('uglifyJS', function (callback) {
	compileJS(true, false, callback);
});

//development
gulp.task('compressJS', function (callback) {
	compileJS(false, false, callback);
});












// ================ STATIC STUFF ================
// This includes anything that is the same between prod, dev, and testing
// includes fonts, images, root files (robots.txt and index.html), css, and html
gulp.task('copyFonts', function () {
	return gulp.src('frontend/fonts/*')
		.pipe(gulp.dest('dist/fonts'));
});

gulp.task('watchCopyFonts', function () {
	gulp.watch(['frontend/fonts/*'], ['copyFonts']);
});


gulp.task('copyImages', function () {
	return gulp.src('frontend/images/*').pipe(gulp.dest('dist/images'));
});

gulp.task('watchCopyImages', function () {
	gulp.watch(['frontend/images/*'], ['copyImages']);
});

// Copy everything that isn't a folder from the src/ dir to the static/ dir
gulp.task('copyRootFiles', function (callback) {

	// List all files and folders in the root src/ dir
	glob("frontend/*", function (err, results) {
		if (err) {
			return callback(err);
		}

		var files = [];

		var q = queue();

		// Filter out everything that isnt a file
		results.forEach(function (name) {
			q.defer(function (callback) {

				fs.stat(name, function (err, stats) {
					if (err) {
						return callback(err)
					}
					if (stats.isFile()) {
						files.push(name)
					}
					callback();
				})
			})
		})


		q.awaitAll(function (err) {
			if (err) {
				return callback(err);
			}

			var q = queue();

			// Copy all files to the output dir
			files.forEach(function (file) {
				q.defer(function (callback) {

					var fileName = path.basename(file);

					var stream = gulp.src(file);

					stream = injectMacros(stream)

					// sw.js is the only file that runs through this stuff now
					if (file.endsWith('.js')) {

						// This wraps the code in an anonymous function that is called immediately. Helps uglifyJS uglify more things. 
						stream = stream.pipe(iife())
						if (macros.PRODUCTION) {
							stream = stream.pipe(streamify(uglify({
								options: {
									ie_proof: false
								},
								compress: UGLIFY_JS_CONFIG
							})))
						}
					}

					stream.pipe(gulp.dest('./dist'))
						.on('error', function (err) {
							onError(err)
						})
						.on('end', function () {
							callback()
						})

				})

			})

			q.awaitAll(function (err) {
				return callback(err)
			})

		})
	})
});

gulp.task('watchcopyRootFiles', function () {
	gulp.watch(['frontend/*'], ['copyRootFiles']);
});


// =========== HTML ===========

gulp.task('copyHTML', function () {
	return gulp
		.src('./frontend/js/**/*.html')
		.pipe(flatten())
		.pipe(htmlmin({
			collapseWhitespace: true,
			removeComments: true
		}))
		.pipe(angularTemplates({
			module: 'templates',
			standalone: true
		}))
		.pipe(concat('html.js'))
		.pipe(gulp.dest('./dist/js'))
})

gulp.task('watchCopyHTML', function () {
	gulp.watch(['frontend/js/**/*.html'], ['copyHTML']);
});

// =========== CSS ===========
// Css files that don't end in .min.css are minified
// cssnano is too slow and takes a couple seconds
gulp.task('copyCSS', function (callback) {

	return gulp.src(['frontend/css/*', '!frontend/css/*.min.css'])
		.pipe(concat('allthecss.css'))
		.pipe(cssnano({
			discardComments: {
				removeAll: true
			}
		}))
		// .pipe(cleanCSS({
		// 	keepSpecialComments: 0
		// }))
		.pipe(addsrc('frontend/css/*.min.css'))
		.pipe(concat('allthecss.css'))
		.pipe(gulp.dest('dist/css'));
});


gulp.task('watchCopyCSS', function () {
	gulp.watch(['frontend/css/*'], ['copyCSS']);
});




gulp.task('copyStatic', ['copyFonts', 'copyImages', 'copyRootFiles', 'copyHTML', 'copyCSS'], function () {

});

gulp.task('watchCopyStatic', ['watchCopyFonts', 'watchCopyImages', 'watchcopyRootFiles', 'watchCopyHTML', 'watchCopyCSS'], function () {

});



//main prod starting point
gulp.task('prod', ['uglifyJS', 'copyStatic', 'watchCopyStatic'], function () {
	require('./backend/server')
})


gulp.task('dev', ['compressJS', 'copyStatic', 'watchCopyStatic'], function () {
	require('./backend/server')
})


gulp.task('ftest', ['copyStatic', 'watchCopyStatic'], function () {

	// This is called every time the js is rebundled, and we only want to start the karma server once
	var hasCompiledOnce = false;
	compileJS(false, true, function () {
		if (hasCompiledOnce) {
			return;
		}
		hasCompiledOnce = true;

		new karma.Server(KARMA_CONFIG, function (exitCode) {
			console.log('ERROR Karma has exited with ' + exitCode)
			onError('KARMA has crashed!!!!');
			// process.exit()
		}).start();

	});
});



// if u want to u can run individual test files with
// jasmine-node ellucianSectionParser.tests.js  --matchall
// also don't compare pageDatas directly with expect(pageData).toEqual, it will cause jasmine to eat up all yo ram and crash

// the batch is a solution for a async problem,
// where if you quickly saved a file a bunch of times, 
// gulp would run the watcher again before the prior run finished
// so the require.cache would be cleared halfway through the excecution of the first tests
// which messed up a lot of stuff
var btestRun = batch(function (events, callback) {

	glob('backend/**/*.js', function (err, files) {
		files.forEach(function (file) {
			var filePath = path.resolve(file);
			delete require.cache[filePath]
		})

		// Originally, was using gulp-jasmine, but that is only a small wrapper around jasmine and only does two things:
		// 1. delete files from require.cache (which it wasen't doing correcly, and had to be done here too)
		// 2. includes a custom reporter, which was bad and was using a custom one anyway
		// so after some more problems with it just decided to bypass it instead
		var jasmine = new Jasmine();


		var filesToProccess = [];
		files.forEach(function (file) {

			// add all the .tests.js files to jasmine
			if (_(file).endsWith('tests.js')) {
				var resolvedPath = path.resolve(file);
				jasmine.addSpecFile(resolvedPath);
			};
		})

		jasmine.addReporter(new JasmineReporter());
		jasmine.execute();
		jasmine.onComplete(function (passedAll) {
			callback()
		})
	});
}, function (err) {
	onError('BATCH FAILED!' + err);
});



gulp.task('btest', function () {
	btestRun();
	gulp.watch(['backend/**/*.js'], btestRun);
});

gulp.task('test', ['btest', 'ftest'], function () {});



// when spider is running, it is the only thing that could be updating that college at that time
gulp.task('spider', function () {
	require('./backend/pageDataMgr').main()
});





module.exports = gulp;
