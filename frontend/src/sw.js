'use strict';


// More info about service workers:
// https://serviceworke.rs/
// This was created from this: https://googlechrome.github.io/samples/service-worker/read-through-caching/
// and many other places on the internet



// macros.DEVELOPMENT and macros.PRODUCTION are swapped with true and false by gulp-replace
// this is just here so it dosen't crash if this isn't ran through gulp-replace
var macros = {};


var CACHE_VERSION = 1;
var CURRENT_CACHES = {
  'read-through': 'read-through-cache-v' + CACHE_VERSION
}; 

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

this.addEventListener('activate', function (event) {
  // Delete all caches that aren't named in CURRENT_CACHES.
  // While there is only one cache in this example, the same logic will handle the case where
  // there are multiple versioned caches.
  var expectedCacheNames = Object.keys(CURRENT_CACHES).map(function (key) {
    return CURRENT_CACHES[key];
  });

  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (expectedCacheNames.indexOf(cacheName) === -1) {
            // If this cache name isn't present in the array of "expected" cache names, then delete it.
            return caches.delete(cacheName);
            console.log('Deleting out of date cache:', cacheName);
          }
        })
      );
    })
    .then(function () {
      return self.clients.claim()
    }.bind(this)));
});

var postToCache = [
  '/listColleges',
  '/listTerms',
  '/listSubjects',
  '/listClasses',
  '/listSections',
]

var keys = [
  'host',
  'termId',
  'subject',
  'classUid',
  'crn'
]

function shouldCachePost(url) {
  for (var i = postToCache.length - 1; i >= 0; i--) {
    if (url.endsWith(postToCache[i])) {
      return true;
    }
  }
  return false
}





function go(request, requestForCache) {
  //console.log('Handling fetch event for', request.url);
  return caches.open(CURRENT_CACHES['read-through']).then(function (cache) {
    return cache.match(requestForCache).then(function (response) {
      if (response) {
        // If there is an entry in the cache for event.request, then response will be defined
        // and we can just return it.
        // console.log(' Found response in cache:', response);

        //update the cache
        fetch(request.clone()).then(function (response) {
          //console.log('  Response for %s from network is: %O', request.url, response);

          // Optional: add in extra conditions here, e.g. response.type == 'basic' to only cache
          // responses from the same domain. See https://fetch.spec.whatwg.org/#concept-response-type
          if (response.status < 400 && response.type == 'basic') {
            // This avoids caching responses that we know are errors (i.e. HTTP status code of 4xx or 5xx).
            // One limitation is that, for non-CORS requests, we get back a filtered opaque response
            // (https://fetch.spec.whatwg.org/#concept-filtered-response-opaque) which will always have a
            // .status of 0, regardless of whether the underlying HTTP call was successful. Since we're
            // blindly caching those opaque responses, we run the risk of caching a transient error response.
            //
            // We need to call .clone() on the response object to save a copy of it to the cache.
            // (https://fetch.spec.whatwg.org/#dom-request-clone)
            cache.put(requestForCache, response);
          }
        });

        return response;
      }

      // Otherwise, if there is no entry in the cache for request, response will be
      // undefined, and we need to fetch() the resource.
      //console.log(' No response for %s found in cache. About to fetch from network...', request.url);

      // We call .clone() on the request since we might use it in the call to cache.put() later on.
      // Both fetch() and cache.put() "consume" the request, so we need to make a copy.
      // (see https://fetch.spec.whatwg.org/#dom-request-clone)
      return fetch(request.clone()).then(function (response) {
        // console.log('  Response for %s from network is: %O', request.url, response);

        // Optional: add in extra conditions here, e.g. response.type == 'basic' to only cache
        // responses from the same domain. See https://fetch.spec.whatwg.org/#concept-response-type
        if (response.status < 400 && response.type == 'basic') {
          // This avoids caching responses that we know are errors (i.e. HTTP status code of 4xx or 5xx).
          // One limitation is that, for non-CORS requests, we get back a filtered opaque response
          // (https://fetch.spec.whatwg.org/#concept-filtered-response-opaque) which will always have a
          // .status of 0, regardless of whether the underlying HTTP call was successful. Since we're
          // blindly caching those opaque responses, we run the risk of caching a transient error response.
          //
          // We need to call .clone() on the response object to save a copy of it to the cache.
          // (https://fetch.spec.whatwg.org/#dom-request-clone)
          cache.put(requestForCache, response.clone());
        }

        // Return the original response object, which will be used to fulfill the resource request.
        return response;
      });
    }).catch(function (error) {
      // This catch() will handle exceptions that arise from the match() or fetch() operations.
      // Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
      // It will return a normal response object that has the appropriate error code set.
      console.error('  Read-through caching failed:', error);

      throw error;
    });
  })
}







// This sample illustrates an aggressive approach to caching, in which every valid response is
// cached and every request is first checked against the cache.
// This may not be an appropriate approach if your web application makes requests for
// arbitrary URLs as part of its normal operation (e.g. a RSS client or a news aggregator),
// as the cache could end up containing large responses that might not end up ever being accessed.
// Other approaches, like selectively caching based on response headers or only caching
// responses served from a specific domain, might be more appropriate for those use cases.
this.addEventListener('fetch', function (event) {

  if (event.request.url.startsWith('data:')) {
    return;
  }

  if (event.request.method != 'GET' && !shouldCachePost(event.request.url)) {
    return;
  }

  if (macros.DEVELOPMENT && event.request.url.endsWith('.js')) {
    // console.log("Not caching .js on dev");
    return;
  }

  var requestForCache;

  // ghetto convert a post to a get until cache supports post
  if (shouldCachePost(event.request.url)) {
    event.respondWith(event.request.clone().text().then(function (text) {
      var body = JSON.parse(text);
      var newEndingUrl = [];

      for (var i = 0; i < keys.length; i++) {
        newEndingUrl.push(body[keys[i]])
      }

      var newUrl = event.request.url + '/' + newEndingUrl.join('/')

      //console.log("new url: ", newUrl);

      return go(event.request, new Request(newUrl))
    }.bind(this)))
  }
  else {
    event.respondWith(go(event.request, event.request));
  }
});
