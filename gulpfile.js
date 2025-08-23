'use strict';

const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync');
const cleanCss = require('gulp-clean-css');
const del = require('del');
const filter = require('gulp-filter');
const gulp = require('gulp');
const gzip = require('gulp-gzip');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const less = require('gulp-less');
const log = require('fancy-log');
const notify = require("gulp-notify");
const path = require('path');
const request = require('request');
const rev = require('gulp-rev');
const revNapkin = require('gulp-rev-napkin');
const revReplace = require('gulp-rev-replace');
const size = require('gulp-size');
const useref = require('gulp-useref');

const plugins = {
  autoprefixer,
  cleanCss,
  filter,
  gzip,
  htmlmin,
  imagemin,
  less,
  notify,
  rev,
  revNapkin,
  revReplace,
  size,
  useref,
};

/**
 * Tasks
 */

gulp.task('build', gulp.series(
  buildClean,
  styles,
  scripts,
  images,
  fonts,
  copy
));

gulp.task('dist', gulp.series(
  'build',
  cachebust,
  compressStyles,
  html
));

gulp.task('default', gulp.series('build', watch));

/**
 * Utils
 */

function handleError () {
  const args = Array.prototype.slice.call(arguments);

  // send error to notification center with gulp-notify
  plugins.notify.onError({
    title  : 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args);

  log(args);

  // keep gulp from hanging on this task
  this.emit('end');
}

function styles () {
  browserSync.notify('Compiling LESS files...');

  return gulp.src(['src/styles/styles.less'])
    .pipe(plugins.less())
    .on('error', handleError)
    .pipe(plugins.autoprefixer())
    .pipe(plugins.size({title: 'CSS'}))
    .pipe(plugins.cleanCss())
    .pipe(plugins.size({title: 'CSS Minified'}))
    .pipe(gulp.dest('dist/styles'))
    .pipe(browserSync.reload({stream: true}));
}

function scripts () {
  return gulp.src([
    'node_modules/html5shiv/dist/html5shiv.min.js',
    'node_modules/picturefill/dist/picturefill.min.js'
  ])
  .pipe(gulp.dest('dist/scripts'))
  .pipe(browserSync.reload({stream: true}));
}

function images () {
  return gulp.src('src/images/**/*', { encoding: false })
    .pipe(plugins.imagemin({
      optimizationLevel: 3,
      progressive : true,
      interlaced : true
    }))
    .pipe(gulp.dest('dist/images'))
    .pipe(browserSync.reload({stream: true}));
}

function fonts () {
  return gulp.src('node_modules/font-awesome/fonts/*', { encoding: false })
    .pipe(gulp.dest('dist/fonts'))
    .pipe(browserSync.reload({stream: true}));
}

function html () {
  return gulp.src('dist/index.html')
    .pipe(plugins.size({title: 'HTML'}))
    .pipe(plugins.htmlmin({ collapseWhitespace: true }))
    .pipe(plugins.size({title: 'HTML Minified'}))
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.reload({stream: true}));
}

function cachebust () {
  const indexFilter = plugins.filter(['**/*', '!**/index.html'], { restore: true });

  return gulp.src('dist/index.html')
    .pipe(plugins.useref())
    .pipe(indexFilter)
    .pipe(plugins.rev()) // calculate assets revision hash
    .pipe(indexFilter.restore)
    .pipe(plugins.revReplace()) // replace references to assets with revision hash
    .pipe(gulp.dest('dist'))
    .pipe(plugins.revNapkin()); // delete original files
}

function copy () {
  return gulp.src(['src/*.{html,ico,txt}'])
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.reload({stream: true}));
}

function compressStyles () {
  return gulp.src(['dist/styles/*.css'])
    .pipe(plugins.gzip())
    .pipe(plugins.size({title: 'CSS Gzip'}))
    .pipe(gulp.dest('dist/styles'));
}

function buildClean (callback) {
  del(['dist']).then((paths) => { callback(); });
}

function watch () {
  // browser sync
  browserSync.init({
    server: {
      baseDir: 'dist',
      middleware: [
        function (req, res, next) {
          const ext = path.extname(req.url);
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
  gulp.watch('src/styles/**/*.less', styles);
  gulp.watch('src/images/**/*', images);
  gulp.watch('src/*.{html,ico,txt}', copy);
}
