'use strict';

const gulp = require('gulp');
const path = require('path');
const browserSync = require('browser-sync');
const del = require('del');
const plugins = require('gulp-load-plugins')();
const log = require('fancy-log');

/**
 * Tasks
 */

gulp.task('build', gulp.series(
  buildClean,
  less,
  js,
  images,
  fonts,
  copy
));

gulp.task('dist', gulp.series(
  'build',
  cachebust,
  gzip,
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

function less () {
  browserSync.notify('Compiling LESS files...');

  return gulp.src(['app/styles/styles.less'])
    .pipe(plugins.less())
    .on('error', handleError)
    .pipe(plugins.autoprefixer())
    .pipe(plugins.size({title: 'CSS'}))
    .pipe(plugins.cleanCss())
    .pipe(plugins.size({title: 'CSS Minified'}))
    .pipe(gulp.dest('public/styles'))
    .pipe(browserSync.reload({stream: true}));
}

function js () {
  return gulp.src([
    'node_modules/html5shiv/dist/html5shiv.min.js',
    'node_modules/picturefill/dist/picturefill.min.js'
  ])
  .pipe(gulp.dest('public/scripts'))
  .pipe(browserSync.reload({stream: true}));
}

function images () {
  return gulp.src('app/images/**/*')
    .pipe(plugins.imagemin({
      optimizationLevel: 3,
      progressive : true,
      interlaced : true
    }))
    .pipe(gulp.dest('public/images'))
    .pipe(browserSync.reload({stream: true}));
}

function fonts () {
  return gulp.src(['node_modules/font-awesome/fonts/*'])
    .pipe(gulp.dest('public/fonts'))
    .pipe(browserSync.reload({stream: true}));
}

function html () {
  return gulp.src('public/index.html')
    .pipe(plugins.size({title: 'HTML'}))
    .pipe(plugins.htmlmin({ collapseWhitespace: true }))
    .pipe(plugins.size({title: 'HTML Minified'}))
    .pipe(gulp.dest('public'))
    .pipe(browserSync.reload({stream: true}));
}

function cachebust () {
  const indexFilter = plugins.filter(['**/*', '!**/index.html'], { restore: true });

  return gulp.src('public/index.html')
    .pipe(plugins.useref())
    .pipe(indexFilter)
    .pipe(plugins.rev()) // calculate assets revision hash
    .pipe(indexFilter.restore)
    .pipe(plugins.revReplace()) // replace references to assets with revision hash
    .pipe(gulp.dest('public'))
    .pipe(plugins.revNapkin()); // delete original files
}

function copy () {
  return gulp.src(['app/*.{html,ico,txt}'])
    .pipe(gulp.dest('public'))
    .pipe(browserSync.reload({stream: true}));
}

function gzip () {
  return gulp.src(['public/styles/*.css'])
    .pipe(plugins.gzip())
    .pipe(plugins.size({title: 'CSS Gzip'}))
    .pipe(gulp.dest('public/styles'));
}

function buildClean (callback) {
  del(['public']).then((paths) => { callback(); });
}

function watch () {
  // browser sync
  browserSync.init({
    server: {
      baseDir: 'public',
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
  gulp.watch('app/styles/**/*.less', less);
  gulp.watch('app/images/**/*', images);
  gulp.watch('app/*.{html,ico,txt}', copy);
}
