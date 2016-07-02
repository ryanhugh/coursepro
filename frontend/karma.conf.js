module.exports = function (config) {
  config.set({
    files: [
      "static/js/internal/vender.tests.js",
      "static/js/internal/app.tests.js",
      "static/js/external/select2.min.js",
      "static/js/external/selectize.min.js",
      "static/js/external/angular-selectize.js",
      "static/js/internal/html.js",
    ],
    plugins: [
      'karma-chrome-launcher',
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-logcapture-reporter',
      'karma-mocha-reporter',
    ],
    frameworks: ['jasmine'],
    preprocessors: {},
    browsers: ['PhantomJS'],
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
