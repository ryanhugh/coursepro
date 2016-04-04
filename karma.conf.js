var proxyquire = require('proxyquireify');

module.exports = function (config) {
  config.set({
    files: [
      'frontend/src/**/*.js',
      'frontend/src/**/*.json',
      "frontend/static/js/internal/html.js",
      "frontend/static/js/external/select2.min.js",
      "frontend/static/js/external/selectize.min.js",
      "frontend/static/js/external/angular-selectize.js",
    ],
    plugins: [
      'karma-chrome-launcher',
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-browserify',
      'karma-logcapture-reporter',
      'karma-mocha-reporter',

    ],
    frameworks: ['browserify', 'jasmine'],
    preprocessors: {
      'frontend/src/**/*.js': ['browserify'],
      'frontend/src/**/*.json': ['browserify']
    },
    browsers: ['PhantomJS'],
    browserify: {
      debug: true,
      plugin: ['proxyquire-universal'],
      configure: function (bundle) {
        bundle.plugin(proxyquire.plugin)
      }
    },
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
      // colors: {
      //   success: 'blue',
      //   info: 'bgGreen',
      //   warning: 'cyan',
      //   error: 'bgRed'
      // }
      output: 'minimal'
    },
  });
};
