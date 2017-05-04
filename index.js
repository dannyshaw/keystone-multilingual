var LanguageRouter = require('./lib/router.js')
var instance;

exports = module.exports = (function() {

	if(instance)
		return instance;

	var keystone;
	var languageRouter;

	this.init = function(keystoneInstance) {
		keystone = keystoneInstance;

		//create router
		languageRouter = new LanguageRouter(keystone);

		//add new model to keystone
		var TranslatableList = require('./lib/model.js')(keystone);
		keystone._List = keystone.List;
		keystone.List = TranslatableList;

	};

	this.initMiddleware = function(options) {
		languageRouter.init(options);
	};


	instance = this;

	return this;

}());

