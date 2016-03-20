module.exports = function(config) {
  config.set({
    files: [
      'frontend/test.js'
    ],
    frameworks: ['browserify', 'jasmine'],
    preprocessors: {
      'frontend/test.js': ['coverage', 'browserify']
    },
    browsers: ['chrome'],
    reporters: ['coverage', 'spec', 'failed'],
    browserify: {
      debug: true,
    }
  });
};