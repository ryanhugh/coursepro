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
      'karma-browserify'
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
    }
  });
};
