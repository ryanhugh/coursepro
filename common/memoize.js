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

// Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
// This accumulates the arguments passed into an array, after a given index.
// From underscore.js (https://github.com/jashkenas/underscore/pull/2140).
function _restParam(func, startIndex) {
    startIndex = startIndex == null ? func.length - 1 : +startIndex;
    return function () {
        var length = Math.max(arguments.length - startIndex, 0);
        var rest = Array(length);
        for (var index = 0; index < length; index++) {
            rest[index] = arguments[index + startIndex];
        }
        switch (startIndex) {
            case 0:
                return func.call(this, rest);
            case 1:
                return func.call(this, arguments[0], rest);
        }
        // Currently unused but handle cases outside of the switch statement:
        // var args = Array(startIndex + 1);
        // for (index = 0; index < startIndex; index++) {
        //     args[index] = arguments[index];
        // }
        // args[startIndex] = rest;
        // return func.apply(this, args);
    };
}


module.exports = function (fn, hasher) {
    var memo = {};
    var queues = {};
    if (!hasher) {
    	hasher = function(){}
    }
    
    var has = Object.prototype.hasOwnProperty;
    var memoized = _restParam(function memoized(args) {
        var callback = args.pop();
        var key = String(hasher.apply(this, args)); // ADDED A String here
        if (has.call(memo, key)) {
            setTimeout(function () {
                callback.apply(this, memo[key]); // CHANGED all the null -> this
            },0);
        }
        else if (has.call(queues, key)) {
            queues[key].push(callback);
        }
        else {
            queues[key] = [callback];
            fn.apply(this, args.concat([_restParam(function (args) {
                memo[key] = args;
                var q = queues[key];
                if (!q) {
                	console.error('CALLED CALLBACK TWICE!',new Error().stack)
                	debugger
                }
                delete queues[key];
                for (var i = 0, l = q.length; i < l; i++) {
                    q[i].apply(this, args);
                }
            })]));
        }
    });
    memoized.memo = memo;
    memoized.unmemoized = fn;
    memoized.hasher = hasher;
    return memoized;
};
