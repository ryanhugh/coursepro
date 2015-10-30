var uglify = require('gulp-uglify');
var gulp = require('gulp');
var wrap = require("gulp-wrap");
var concat = require("gulp-concat");

gulp.task('uglify', function() {
	return gulp.src(['frontend/js/*.js','frontend/js/modules/*.js'])
	.pipe(wrap('(function(){\n<%= contents %>\n})();'))
	.pipe(uglify())
	.pipe(concat("allthejavascript.js"))
	.pipe(gulp.dest('frontend/static/js/internal'));
});



gulp.task('prod',['uglify'],function() {
  require('./server')
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
	require('./server')
})


// when frontend tests work, add them here
gulp.tasks('tests',function(){
	require('./')
})


// gulp.task('default',['compress','watch','prod']);