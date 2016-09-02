var page = require('webpage').create()
var system = require('system');
var foo = 42;

page.onConsoleMessage = function (msg) {
  system.stdout.writeLine(msg);
};


phantom.onError = function (msg, trace) {
  var msgStack = ['PHANTOM ERROR: ', JSON.stringify(msg, null, 4)];
  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function (t) {
      msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function+')' : ''));
    });
  }
  system.stdout.writeLine(msgStack.join('\n'));
  // phantom.exit(1);
};


page.onError = function (msg, trace) {
  var msgStack = ['PHANTOM ERROR: ', JSON.stringify(msg, null, 4)];
  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function (t) {
      msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function+')' : ''));
    });
  }
  system.stdout.writeLine(msgStack.join('\n'));
  // phantom.exit(1);
};



page.open(
  'http://localhost/#/graph/neu.edu/201710',
  // 'http://localhost/#/graph/clemson.edu/201608',
  function () {


    console.log("Done");

    // phantom.exit( 0 ); // must exit somewhere in the script
  }
);
