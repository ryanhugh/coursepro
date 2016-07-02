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
var merge = require('merge-stream')

var mdeps = require('module-deps')
var queue = require('d3-queue').queue;

var JSONStream = require('JSONStream');
var batch = require('gulp-batch');
var recursiveDeps = require('recursive-deps');

// for backend unit tests
var jasmineReporter = require('./backend/jasmineReporter')
var Jasmine = require('jasmine');


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
			message: err
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


function getFilesToProcess() {

	var filesToProccess = [];
	// if (!compileRequire) {
	var files = glob.sync('frontend/src/**/*.js');

	files.forEach(function (file) {
		if (!_(file).includes('tests')) {
			filesToProccess.push(file)
		};
	})
	return filesToProccess;

}

// get list of front end only packages
var dependencies = [];
gulp.task('getDependencies', function () {
	var files = getFilesToProcess();




	// var bundler = browserify({
	// 	entries: files,
	// 	// bundleExternal: false,
	// }, {
	// 	basedir: __dirname,
	// 	debug: false,
	// 	cache: {}, // required for watchify
	// 	packageCache: {}, // required for watchify

	// 	// required to be true only for watchify (?) but watchify works when it is off.
	// 	//dont show C:/ryan/google drive etc in the uglified source code
	// 	fullPaths: false,
	// });

	// console.log("HERJERJELJRLEJRLKEJ");


	// bundler.pipeline.get('deps').push(through.obj(
	// 	function (row, enc, next) {
	// 		var name = row.file || row.id;
	// 		if (_(dependencies).includes(name)) {
	// 			console.log('FOUND',name);
	// 			dependencies.push(name);
	// 		}
	// 		next()
	// 	}
	// ));

	// bundler = watchify(bundler)

	// var stream = bundler.bundle();


	// // stream = stream.pipe(source('app.js'));

	// // stream = stream.pipe(gulp.dest('./frontend/static/js/internal'));

	//    stream.pipe(process.stdout);

	// stream.on('end',function () {
	// 	console.log('DONEEEE',files);
	// }.bind(this))

	// var md = mdeps(files);
	// md.pipe(JSONStream.stringify()).pipe(process.stdout);
	// md.end({ file: __dirname + '/frontend/main.js' });


	// return stream;
});


// var packageJson = require('./package.json');
// var dependencies = Object.keys(packageJson && packageJson.dependencies || {});

// if (b.argv.list) {
//     b.pipeline.get('deps').push(through.obj(
//         function (row, enc, next) {
//             console.log(row.file || row.id);
//             next()
//         }
//     ));
//     return b.bundle();
// }

//watch is allways on, to turn off (or add the option back) 
// turn fullPaths back to shouldWatch and only run bundler = watchify(bundler) is shouldWatch is true
// http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/

//another note, if you include a module that dosent exist, it will silently hang forever(?) eg (require('jdklfjdasjfkl'))
function compileJSBundle(shouldUglify, compileRequire, callback) {
	if (compileRequire === undefined) {
		compileRequire = false;
	}

	var filesToProccess = getFilesToProcess();

	recursiveDeps(filesToProccess).then(function (dependencies) {
		// console.log(dependencies); // ['bluebird', 'fs-promise', ...]


		var node_module_dependencies = [];
		dependencies.forEach(function (dep) {
			if (!path.isAbsolute(dep)) {
				node_module_dependencies.push(dep)
			}
		}.bind(this))
		if (compileRequire) {
			console.log(node_module_dependencies);
		}
		else {
			console.log(filesToProccess);
		}


		// console.log('Processing:', filesToProccess,dependencies)

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
		var rebundle = function () {
			console.log("----Rebundling custom JS!----")
			var stream = bundler.bundle();



			stream.on('error', function (err) {
				onError(err);
				// end this stream
				this.emit('end');
			})
			if (compileRequire) {
				stream = stream.pipe(source('vender.js'));
			}
			else {
				stream = stream.pipe(source('app.js'));
			}


			if (shouldUglify) {


				var compressOptions = {
					drop_console: true,
					unsafe: true,
					collapse_vars: true,
					pure_getters: true,
					// warnings: true,
					// keep_fnames: true
				}

				// if (!compileRequire) {
				// 	compressOptions.warnings = true;
				// }

				stream = stream.pipe(streamify(uglify({
					options: {
						ie_proof: false
					},
					compress: compressOptions
				})));
			}

			stream = stream.pipe(gulp.dest('./frontend/static/js/internal'));

			stream.on('end', function () {
				console.log("----Done Rebundling custom JS!----")
				callback();
			}.bind(this))
		};

		bundler.on('update', rebundle);
		rebundle();
	});
}

function compileJS(uglifyJS, callback) {
	var q = queue();

	q.defer(function (callback) {
		compileJSBundle(uglifyJS, true, callback);
	}.bind(this));

	q.defer(function (callback) {
		compileJSBundle(uglifyJS, false, callback);
	}.bind(this));

	q.awaitAll(function (err) {
		callback(err)
	}.bind(this))
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
gulp.task('uglifyJS', ['getDependencies'], function (callback) {
	compileJS(true, callback);
});



//main prod starting point
gulp.task('prod', ['uglifyJS', 'watchCopyHTML', 'copyHTML'], function () {
	require('./backend/server')
})



//development
gulp.task('compressJS', ['getDependencies'], function (callback) {
	compileJS(false, callback);
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

// the batch is a solution for a async problem,
// where if you quickly saved a file a bunch of times, 
// gulp would run the watcher again before the prior run finished
// so the require.cache would be cleared halfway through the excecution of the first tests
// which messed up a lot of stuff
var btestRun = batch(function (events, callback) {
	var files = glob.sync('backend/**/*.js');

	files.forEach(function (file) {
		var filePath = path.resolve(file);
		delete require.cache[filePath]
	}.bind(this))

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

	jasmine.addReporter(new jasmineReporter());
	jasmine.execute();
	jasmine.onComplete(function (passedAll) {
		callback()
	}.bind(this))
}, function (err) {
	console.log('BATCH FAILED!', err);
}.bind(this));

process.on('uncaughtException', function (err) {
	console.log('Caught exception: ', err.stack);
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
