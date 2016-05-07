module.exports = function (moduleName) {
	if (typeof Proxy == 'undefined') {
		return require(moduleName)
	}
	else {
		var module;
		return new Proxy(function () {
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
	}
};
