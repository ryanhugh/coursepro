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

'use strict';
var util = require('util')
var baseDB = require('./databases/baseDB')

// copied from node_modules\jasmine\lib\reporters\console_reporter.js, with some changes
// dosent log . F or * as its running the tests
// closes the db connection when its done


var noopTimer = {
  start: function () {},
  elapsed: function () {
    return 0;
  }
};

function ConsoleReporter() {
  var options = {}
  options.print = options.print || function () {
    process.stdout.write(util.format.apply(this, arguments));
  };
  options.showColors = options.hasOwnProperty('showColors') ? options.showColors : true;
  options.jasmineCorePath = options.jasmineCorePath || this.jasmineCorePath;

  var print = options.print,
    showColors = options.showColors || false,
    timer = options.timer || noopTimer,
    jasmineCorePath = options.jasmineCorePath,
    specCount,
    executableSpecCount,
    failureCount,
    failedSpecs = [],
    pendingSpecs = [],
    ansi = {
      green: '\x1B[32m',
      red: '\x1B[31m',
      yellow: '\x1B[33m',
      none: '\x1B[0m'
    },
    failedSuites = [],
    stackFilter = options.stackFilter || defaultStackFilter;

  var onComplete = options.onComplete || function () {};

  this.jasmineStarted = function () {
    specCount = 0;
    executableSpecCount = 0;
    failureCount = 0;
    print('Started');
    printNewline();
    timer.start();
  };

  this.jasmineDone = function (result) {
    try {
      baseDB.close();
    }
    catch (e) {
      console.log('In jasmineReporter.js: ',e);
    }
    printNewline();
    printNewline();
    if (failedSpecs.length > 0) {
      print('Failures:');
    }
    for (var i = 0; i < failedSpecs.length; i++) {
      specFailureDetails(failedSpecs[i], i + 1);
    }

    if (pendingSpecs.length > 0) {
      print("Pending:");
    }
    for (i = 0; i < pendingSpecs.length; i++) {
      pendingSpecDetails(pendingSpecs[i], i + 1);
    }

    if (specCount > 0) {
      printNewline();

      if (executableSpecCount !== specCount) {
        print('Ran ' + executableSpecCount + ' of ' + specCount + plural(' spec', specCount));
        printNewline();
      }
      var specCounts = executableSpecCount + ' ' + plural('spec', executableSpecCount) + ', ' +
        failureCount + ' ' + plural('failure', failureCount);

      if (pendingSpecs.length) {
        specCounts += ', ' + pendingSpecs.length + ' pending ' + plural('spec', pendingSpecs.length);
      }

      print(specCounts);
    }
    else {
      print('No specs found');
    }

    printNewline();
    var seconds = timer.elapsed() / 1000;
    print('Finished in ' + seconds + ' ' + plural('second', seconds));
    printNewline();

    for (i = 0; i < failedSuites.length; i++) {
      suiteFailureDetails(failedSuites[i]);
    }

    if (result && result.order && result.order.random) {
      print('Randomized with seed ' + result.order.seed);
      printNewline();
    }

    onComplete(failureCount === 0);
  };

  // NOTE: if a spec fails an expect().toBe after it called done, it will cause some other spec error to be logged :/
  // the stack still goes where it should
  var _consoleLog = console.log.bind(console)
  var logs = {}
  this.specStarted = function (spec) {
    logs[spec.id] = []

    console.log = function () {
      var args = Array.prototype.slice.call(arguments);
      if (!logs[spec.id]) {
        logs[spec.id] = []
      }
      logs[spec.id].push(args)
    }
  }

  this.specDone = function (result) {
    console.log = _consoleLog;

    if (!logs[result.id]) {
        logs[result.id] = []
      }

    if (result.failedExpectations.length > 0) {
      logs[result.id].forEach(function (log) {
        console.log.apply(console, log)
      })
    }
    logs[result.id] = undefined

    specCount++;

    if (result.status == 'pending') {
      pendingSpecs.push(result);
      executableSpecCount++;
      // print(colored('yellow', '*'));
      return;
    }

    if (result.status == 'passed') {
      executableSpecCount++;
      // print(colored('green', '.'));
      return;
    }

    if (result.status == 'failed') {
      failureCount++;
      failedSpecs.push(result);
      executableSpecCount++;
      // print(colored('red', 'F'));
    }
  };

  this.suiteDone = function (result) {
    if (result.failedExpectations && result.failedExpectations.length > 0) {
      failureCount++;
      failedSuites.push(result);
    }
  };

  return this;

  function printNewline() {
    print('\n');
  }

  function colored(color, str) {
    return showColors ? (ansi[color] + str + ansi.none) : str;
  }

  function plural(str, count) {
    return count == 1 ? str : str + 's';
  }

  function repeat(thing, times) {
    var arr = [];
    for (var i = 0; i < times; i++) {
      arr.push(thing);
    }
    return arr;
  }

  function indent(str, spaces) {
    var lines = (str || '').split('\n');
    var newArr = [];
    for (var i = 0; i < lines.length; i++) {
      newArr.push(repeat(' ', spaces).join('') + lines[i]);
    }
    return newArr.join('\n');
  }

  function defaultStackFilter(stack) {
    var filteredStack = stack.split('\n').filter(function (stackLine) {
      return stackLine.indexOf(jasmineCorePath) === -1;
    }).join('\n');
    return filteredStack;
  }

  function specFailureDetails(result, failedSpecNumber) {
    printNewline();
    print(failedSpecNumber + ') ');
    print(result.fullName);

    for (var i = 0; i < result.failedExpectations.length; i++) {
      var failedExpectation = result.failedExpectations[i];
      printNewline();
      print(indent('Message:', 2));
      printNewline();
      print(colored('red', indent(failedExpectation.message, 4)));
      printNewline();
      print(indent('Stack:', 2));
      printNewline();
      print(indent(stackFilter(failedExpectation.stack), 4));
    }

    printNewline();
  }

  function suiteFailureDetails(result) {
    for (var i = 0; i < result.failedExpectations.length; i++) {
      printNewline();
      print(colored('red', 'An error was thrown in an afterAll'));
      printNewline();
      print(colored('red', 'AfterAll ' + result.failedExpectations[i].message));

    }
    printNewline();
  }

  function pendingSpecDetails(result, pendingSpecNumber) {
    printNewline();
    printNewline();
    print(pendingSpecNumber + ') ');
    print(result.fullName);
    printNewline();
    var pendingReason = "No reason given";
    if (result.pendingReason && result.pendingReason !== '') {
      pendingReason = result.pendingReason;
    }
    print(indent(colored('yellow', pendingReason), 2));
    printNewline();
  }
}


module.exports = exports = ConsoleReporter;
