// This might work if you need to access properties of require, like require.cache, untested, need nodev6

if (typeof Proxy == 'undefined') {
	console.log("Warning: not using lazyRequire, don't have Proxy");
	module.exports = require
}
else {

	var lazyRequire = new Proxy(function () {
		if (!module) {
			module = require(moduleName)
		}
		return module.apply(this, arguments)
	}, {
		get: function (target, name) {
			if (!module) {
				module = require(moduleName)
			}
			return module[name];
		}
	})


	module.exports = new Proxy(lazyRequire, {
		get: function (target, name) {
			console.log("get",name);
			return require[name]
		},
		set: function (target, name, value) {
			console.log("set",name);
			require[name] = value
		},
		deleteProperty: function (target, name) {
			console.log("delete",name);

			delete require[name]
		}
	})
}
