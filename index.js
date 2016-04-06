module.exports = exports = function(keystone) {
	var Model = require('./lib/model.js')(keystone);
	var Router = new (require('./lib/router.js'))(keystone);

	return {
		Model,
		Router
	}
};


