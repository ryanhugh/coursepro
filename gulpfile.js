var uglify = require('gulp-uglify');
var gulp = require('gulp');
var wrap = require("gulp-wrap");
var concat = require("gulp-concat");

gulp.task('compress', function() {
	return gulp.src(['frontend/js/*.js','frontend/js/modules/*.js'])
	.pipe(wrap('(function(){\n<%= contents %>\n})();'))
	.pipe(uglify())
	.pipe(concat("allthejavascript.js"))
	.pipe(gulp.dest('frontend/static/js'));
});



gulp.task('watch', function() {
  gulp.watch(['js/*.js','js/modules/*.js'], ['compress']);
});



gulp.task('prod',['compress'],function () {
	require('./server.js')
})


gulp.task('default',['compress','watch','server']);