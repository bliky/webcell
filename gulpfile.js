'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var less = require('gulp-less');
var header = require('gulp-header');
var nano = require('gulp-cssnano');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var comments = require('postcss-discard-comments');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');

var pkg = require('./package.json');
var browserSync = require('browser-sync');

var yargs = require('yargs').options({
  w: {
    alias: 'watch',
    type: 'boolean'
  },
  s: {
    alias: 'server',
    type: 'boolean'
  },
  p: {
    alias: 'port',
    type: 'number'
  }
}).argv;

var dist = __dirname + '/dist';

var banner = [
  '/*!',
  ' * Webcell v<%= pkg.version %> (<%= pkg.homepage %>)',
  ' * Copyright <%= new Date().getFullYear() %> FV, Inc.',
  ' * Licensed under the <%= pkg.license %> license',
  ' */',
  ''
].join('\n');

gulp.task('default', ['build'], function () {
  if (yargs.s) {
    gulp.start('server');
  }

  if (yargs.w) {
    gulp.start('watch');
  }
});

gulp.task('watch', ['build'], function() {
  gulp.watch('src/less/**/*', ['build:style']);
  gulp.watch('src/**/*.js', ['build:js']);
});

gulp.task('server', function() {
  yargs.p = yargs.p || 8080;
  browserSync.init({
    server: {
      baseDir: "./",
      index: "index.html"
    },
    ui: {
      port: yargs.p + 1,
      weinre: {
        port: yargs.p + 2
      }
    },
    port: yargs.p,
    startPath: ''
  });

  gulp.watch(["index.html", "pages/*.html"]).on('change', browserSync.reload);
});

gulp.task('build', ['build:style', 'build:js']);

gulp.task('build:style', function () {
  gulp.src('./src/less/webcell.less')
      .pipe(sourcemaps.init())
      .pipe(less().on('error', function(e) {
        console.error(e.message);
        this.emit('end');
      }))
      .pipe(postcss([autoprefixer(['iOS >= 7', 'Android >= 4.1']), comments()]))
      .pipe(header(banner, { pkg: pkg }))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(dist))
      .pipe(browserSync.reload({ stream: true }))
      .pipe(
        nano({
          zindex: false,
          autoprefixer: false
        })
      )
      .pipe(
        rename(function(path) {
          path.basename += '.min';
        })
      )
      .pipe(gulp.dest(dist));
})

gulp.task('build:js', ['concatjs'], function () {
  var fs = require('fs');
  var wrapper = fs.readFileSync('src/wrapper.js', {encoding:'utf8'});
  var wrap = wrapper.split(/[\x20\t]*\/\/ @CODE\n(?:[\x20\t]*\/\/[^\n]+\n)*/);

  var code = fs.readFileSync('src/webcell.js', {encoding:'utf8'});
  wrap.splice(1,0,code);

  fs.writeFileSync('dist/webcell.js', wrap.join(''));

  gulp.src('./dist/webcell.js')
    .pipe(sourcemaps.init())
    .pipe(header(banner, { pkg: pkg }))
    .pipe(gulp.dest(dist))
    .pipe(browserSync.reload({ stream: true }))
    .pipe(uglify())
    .pipe(header(banner, { pkg: pkg }))
    .pipe(
      rename(function(path) {
        path.basename += '.min';
      })
    )
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(dist));
})

gulp.task('concatjs', function () {
  gulp.src(['src/view.js', 'src/model.js', 'src/controller.js'])
    .pipe(concat('webcell.js'))
    .pipe(gulp.dest('./src/'))
})
