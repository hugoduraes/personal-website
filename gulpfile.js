'use strict';

var environments = {
    dev: 'development',
    prod: 'production'
}

var gulp = require('gulp'),
    path = require('path'),
    browserSync = require('browser-sync'),
    runSequence = require('run-sequence'),
    del = require('del'),
    plugins = require('gulp-load-plugins')();

/**
 * Utils
 */

var handleError = function () {
    var args = Array.prototype.slice.call(arguments);

    // send error to notification center with gulp-notify
    plugins.notify.onError({
        title  : 'Compile Error',
        message: '<%= error.message %>'
    }).apply(this, args);

    // console log
    plugins.util.log(args);

    // keep gulp from hanging on this task
    this.emit('end');
};

/**
 * Tasks
 */

// Less task
gulp.task('less', function () {
    browserSync.notify('Compiling LESS files...');

    return gulp.src(['app/styles/styles.less'])
        .pipe(plugins.less())
        .on('error', handleError)
        .pipe(plugins.autoprefixer())
        .pipe(plugins.size({title: 'CSS'}))
        .pipe(plugins.minifyCss())
        .pipe(plugins.size({title: 'CSS Minified'}))
        .pipe(gulp.dest('public/styles'))
        .pipe(browserSync.reload({stream: true}));
});

// JavaScript task
gulp.task('js', function() {
    return gulp.src([
            'bower_components/html5shiv/dist/html5shiv.min.js',
            'bower_components/picturefill/dist/picturefill.min.js'
        ])
        .pipe(gulp.dest('public/scripts'))
        .pipe(browserSync.reload({stream: true}));
});

// Images task
gulp.task('images', function() {
    return gulp.src('app/images/**/*')
        .pipe(plugins.imagemin({
            optimizationLevel: 3,
            progressive : true,
            interlaced : true
        }))
        .pipe(gulp.dest('public/images'))
        .pipe(browserSync.reload({stream: true}));
});

// Fonts task
gulp.task('fonts', function() {
    return gulp.src(['bower_components/components-font-awesome/fonts/*'])
        .pipe(gulp.dest('public/fonts'))
        .pipe(browserSync.reload({stream: true}));
});

// HTML task
gulp.task('html', function() {
    return gulp.src('public/index.html')
        .pipe(plugins.size({title: 'HTML'}))
        .pipe(plugins.minifyHtml())
        .pipe(plugins.size({title: 'HTML Minified'}))
        .pipe(gulp.dest('public'))
        .pipe(browserSync.reload({stream: true}));
});

// Cache bust task
gulp.task('cachebust', function() {
    var userefAssets = plugins.useref.assets();

    return gulp.src('public/index.html')
        .pipe(userefAssets)
        .pipe(plugins.rev()) // calculate assets revision hash
        .pipe(userefAssets.restore())
        .pipe(plugins.useref())
        .pipe(plugins.revReplace()) // replace references to assets with revision hash
        .pipe(gulp.dest('public'))
        .pipe(plugins.revNapkin()); // delete original files
});

// Copy task
gulp.task('copy', function() {
    return gulp.src(['app/*.{html,ico,txt}'])
        .pipe(gulp.dest('public'))
        .pipe(browserSync.reload({stream: true}));
});

// Gzip task
gulp.task('gzip', function() {
    return gulp.src(['public/styles/*.css'])
        .pipe(plugins.gzip())
        .pipe(plugins.size({title: 'CSS Gzip'}))
        .pipe(gulp.dest('public/styles'));
});

// Build clean task
gulp.task('build-clean', function (callback) {
    del(['public'], {}, callback);
});

// Build task
gulp.task('build', function (callback) {
    runSequence(
        'build-clean',
        'less',
        'js',
        'images',
        'fonts',
        'copy',
        callback
    );
});

// Dist task
gulp.task('dist', function (callback) {
    // TODO: build distribution to temporary folder and delete it after deployment
    runSequence(
        'build',
        'cachebust',
        'gzip',
        'html',
        callback
    );
});

// Deploy task
gulp.task('deploy', ['dist'], function () {
    var secrets = require('./secretfile.json');

    return gulp.src('public')
        .pipe(plugins.rsync({
            root : 'public',
            hostname : secrets.deploy.username + '@' + secrets.deploy.hostname,
            port : secrets.deploy.port,
            destination : secrets.deploy.path,
            clean: true,
            recursive: true
        }));
});

// Default task
gulp.task('default', ['build'], function () {
    // browser sync
    browserSync.init({
        server: {
            baseDir: 'public',
            middleware: [
                function (req, res, next) {
                    var ext = path.extname(req.url);
                    if ((ext === '' || ext === '.html') && req.url !== '/') {
                        req.pipe(request('http://' + req.headers.host)).pipe(res);
                    } else {
                        next();
                    }
                }
            ]
        },
        port: 3000,
        open: false
    });

    // watch files
    gulp.watch('app/styles/**/*.less', ['less']);
    gulp.watch('app/images/**/*', ['images']);
    gulp.watch('app/*.{html,ico,txt}', ['copy']);
});
