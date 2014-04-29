'use strict';

/* Dependencies */

// gulp and plugins
var gulp = require('gulp');
var activity = require('gulp-file-activity');
var changed = require('gulp-changed');
var clean = require('gulp-clean');
var cssmin = require('gulp-minify-css');
var flatten = require('gulp-flatten');
var gulpif = require('gulp-if');
var imagemin = require('gulp-imagemin');
var jshint = require('gulp-jshint');
var livereload = require('gulp-livereload');
var plumber = require('gulp-plumber');
var prefix = require('gulp-autoprefixer');
var sass = require('gulp-sass');
var streamify = require('gulp-streamify');
var uglify = require('gulp-uglify');

// browserify
var browserify = require('browserify');
var es6ify = require('es6ify');
var watchify = require('watchify');
var debowerify = require('debowerify');
var deamdify = require('deamdify');

// extras
var source = require('vinyl-source-stream');
var stylishJshint = require('jshint-stylish');

/* Functions */

// create browserify bundle creator
var script_bundler_index = function () {
    return browserify()
        .add(es6ify.runtime)
        .transform(es6ify.configure(/^(?!.*(node_modules|vendor))+.+\.js$/))
        .transform(debowerify)
        .transform(deamdify)
        .require('./assets/scripts/app.js', { entry: true })
    ;
};

// compile scripts
var scripts = function (bundler, prod) {
    var starting = new Date();
    return bundler.bundle({ debug: !prod })
        .pipe(source('app.js'))
        .pipe(plumber())
        .pipe(gulpif(prod, streamify(uglify())))
        .pipe(gulp.dest('web/assets/scripts'))
        .pipe(livereload())
        .pipe(streamify(activity({ since: starting })))
    ;
};

// compile styles
var styles = function (prod) {
    var starting = new Date();
    return gulp
        .src('assets/styles/app.scss')
        .pipe(plumber())
        .pipe(sass({
            sourceComments: !prod ? 'map' : null,
            includePaths: [
                'assets/styles',
                'assets/vendor'
            ],
            imagePath: '../images',
            outputStyle: 'nested'
        }))
        .pipe(gulpif(prod, prefix(['last 2 versions', 'ie 8', 'ie 9'])))
        .pipe(gulpif(prod, cssmin()))
        .pipe(gulp.dest('web/assets/styles'))
        .pipe(livereload())
        .pipe(activity({ since: starting }))
    ;
};

// copy fonts
var fonts = function () {
    var FONTS_DEST = 'web/assets/fonts';
    return gulp
        .src(['assets/fonts/**', 'assets/vendor/*/fonts/**'])
        .pipe(plumber())
        .pipe(flatten())
        .pipe(changed(FONTS_DEST))
        .pipe(gulp.dest(FONTS_DEST))
        .pipe(activity({ gzip: true }))
    ;
};

// images and minification of images
var images = function (prod) {
    var IMAGES_DEST = 'web/assets/images';
    return gulp
        .src(['assets/images/**'])
        .pipe(plumber())
        .pipe(changed(IMAGES_DEST))
        .pipe(gulpif(prod, imagemin()))
        .pipe(gulp.dest(IMAGES_DEST))
        .pipe(livereload())
        .pipe(activity({ gzip: true }))
};

// jshint for scripts
var lint_scripts = function () {
    return gulp
        .src('assets/scripts/**/*.js')
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter(stylishJshint))
    ;
};

// clean generated files
var clean = function () {
    return gulp
        .src(['web/assets', '.sass-cache'], {read: false})
        .pipe(plumber())
        .pipe(clean())
    ;
};

/* Basic tasks */
gulp.task('scripts', function() {
    var bundler = script_bundler_index();
    return scripts(bundler, true);
});

gulp.task('styles', function () {
    return styles(true);
});

gulp.task('fonts', function () {
    return fonts();
});

gulp.task('images', function () {
    return images(true);
});

gulp.task('lint', function () {
    return lint_scripts();
});

gulp.task('clean', function () {
    return clean();
});

/* Combined and advanced tasks */
gulp.task('watch', function () {
    var scriptBundler = watchify(script_bundler_index());
    scriptBundler.on('update', function () {
        return scripts(scriptBundler, false);
    });

    scripts(scriptBundler, false);
    styles(false);
    fonts();
    images(false);

    gulp.watch('assets/styles/**/*.scss', function () {
        return styles(false);
    });

    gulp.watch('assets/images/**', function () {
        return images(false);
    });
});

gulp.task('server', ['watch'], function () {
    var serv = require('child_process').spawn('php', ['bin/symfony', 'server:run']);
    var logger = function (data) {
        if (data.toString().trim().length > 0) {
            console.log(data.toString().trim("\n"));
        }
    };
    serv.stdout.on('data', logger);
    serv.stderr.on('data', logger);
    return serv;
});

gulp.task('build', ['scripts', 'styles', 'fonts', 'images'])

gulp.task('default', ['build']);
