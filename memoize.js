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
    var has = Object.prototype.hasOwnProperty;
    hasher = hasher || function () {
        return 'a';
    };
    var memoized = _restParam(function memoized(args) {
        var callback = args.pop();
        var key = hasher.apply(null, args);
        if (has.call(memo, key)) {
            setTimeout(function () {
                callback.apply(null, memo[key]);
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
                delete queues[key];
                for (var i = 0, l = q.length; i < l; i++) {
                    q[i].apply(null, args);
                }
            })]));
        }
    });
    memoized.memo = memo;
    memoized.unmemoized = fn;
    return memoized;
};
