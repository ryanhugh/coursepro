/*
 * Copyright (c) 2017 Ryan Hughes
 *
 * This file is part of CoursePro.
 *
 * CoursePro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License
 * version 3 as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>. 
 */

// This file was used with 'gulp testAllGraphs' to load every graph on the site to make sure every
// possible graph could be loaded without any errors. 

'use strict';
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
  'http://localhost/#!/graph/neu.edu/201710',
  // 'http://localhost/#!/graph/clemson.edu/201608',
  function () {


    console.log("Done");

    // phantom.exit( 0 ); // must exit somewhere in the script
  }
);
