module.exports = function (config) {
  config.set({
    files: [
      "static/js/vender.tests.js",
      "static/js/app.tests.js",
      "static/js/html.js",
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
