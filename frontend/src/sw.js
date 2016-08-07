'use strict';

// More info about service workers:
// https://serviceworke.rs/
// This was created from this: https://googlechrome.github.io/samples/service-worker/read-through-caching/
// and many other places on the internet


// macros.DEVELOPMENT and macros.PRODUCTION are swapped with true and false by gulp-replace
// this is just here so it dosen't crash if this isn't ran through gulp-replace
var macros = {};

var CACHE_NAME = 'main';

self.addEventListener('install', function (event) {
	event.waitUntil(self.skipWaiting());
});

this.addEventListener('activate', function (event) {
	// Delete all caches that aren't equal to CACHE_NAME
	event.waitUntil(
		caches.keys().then(function (cacheNames) {

			var promises = [];
			cacheNames.forEach(function (cacheName) {
				if (cacheName != CACHE_NAME) {
					console.log('Deleting unexpected cache:', cacheName);
					promises.push(caches.delete(cacheName))
				}
			}.bind(this))

			return Promise.all(promises);
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

// Fetches a request and caches the response in the cache if it is a valid response. 
// If the response is needed elsewhere, set shouldReturnResponse to true to return the reponse too. 
function fetchAndCache(request, requestForCache, shouldReturnResponse) {

	//update the cache
	return fetch(request).then(function (response) {
		// responses from the same domain. See https://fetch.spec.whatwg.org/#concept-response-type
		var retVal;
		if (shouldReturnResponse) {
			retVal = response.clone()
		}
		if (response.status < 400 && response.type == 'basic') {
			cache.put(requestForCache, response);
		}
		if (retVal) {
			return retVal;
		}
	});
}.bind(this)


function go(request, requestForCache) {
	return caches.open(CACHE_NAME).then(function (cache) {
		return cache.match(requestForCache).then(function (response) {
			if (response) {
				// If there is an entry in the cache for event.request, then response will be defined
				// and we can just return it.
				// console.log(' Found response in cache:', response);
				fetchAndCache(request, requestForCache, false);
				return response;
			}

			return fetchAndCache(request, requestForCache, true);

		}).catch(function (error) {
			// This catch() will handle exceptions that arise from the match() or fetch() operations.
			// Note that a HTTP error response (e.g. 404) will NOT trigger an exception.
			// It will return a normal response object that has the appropriate error code set.
			console.error('  Read-through caching failed:', error);
			if (error && error.stack) {
				console.error(error.stack)
			}

			throw error;
		});
	})
}



this.addEventListener('fetch', function (event) {

	if (event.request.url.startsWith('data:')) {
		return;
	}

	if (event.request.method != 'GET' && !shouldCachePost(event.request.url)) {
		return;
	}

	var url = event.request.url;
	if (macros.DEVELOPMENT && (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('/'))) {
		return;
	}

	// ghetto convert a post to a get until cache supports post
	if (shouldCachePost(url)) {
		event.respondWith(event.request.clone().text().then(function (text) {
			var body = JSON.parse(text);
			var newEndingUrl = [];

			for (var i = 0; i < keys.length; i++) {
				newEndingUrl.push(body[keys[i]])
			}

			var newUrl = url + '/' + newEndingUrl.join('/')

			return go(event.request, new Request(newUrl))
		}.bind(this)))
	}
	else {
		event.respondWith(go(event.request, event.request));
	}
});
