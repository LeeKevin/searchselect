var gulp = require('gulp');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var notify = require("gulp-notify");
var autoprefixer = require('gulp-autoprefixer');
var cache = require('gulp-cached');

var input = './resources/assets';
var output = './web/css/';

gulp.task('default', function () {
    //Sass
    return gulp
        .src(input + '/sass/**/*.scss')
        .pipe(cache('sass'))
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(notify({
            message: "<%= file.relative %>",
            title: "Sass Compiled!"
        }))
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest(output))
        ;
});

gulp.task('watch', function () {
    return gulp
        // Watch the input folder for change,
        // and run `sass` task when something happens
        .watch(input + '/**/*.scss', ['default'])
        // When there is a change,
        // log a message in the console
        .on('change', function (event) {
            console.log('Sass updated: ' + event.path.replace(/^.*[\\\/]/, '') + ' ' + event.type);
        });
});