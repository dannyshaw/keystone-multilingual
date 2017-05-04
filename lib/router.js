var _ = require('underscore');
var invariant = require('invariant');
var i18n = require("i18n-2");
var Router = require('named-routes');

var namedRouter = new Router();


var LanguageRouter = function (keystone) {
	this.keystone = keystone;
}

LanguageRouter.prototype = {

	init: function (options) {

		invariant(options.app, "You must pass the app in as an init() option");
		var app = this.app = options.app.bind(options.app);

		invariant(options.languageNavMap, "You must pass the language nav map in as an init() option");
		this.languageNavMap = options.languageNavMap;

		invariant(options.languageRouteMap, "You must pass the language route map in as an init() option");
		this.languageRouteMap = options.languageRouteMap;

		// Configure i18n bindings
		var i18nOpts = Object.assign({
		    locales: ['en', 'de'],
		}, options.i18n || {});

		i18n.expressBind(app, i18nOpts);

		//setup named routes
		namedRouter.extendExpress(app);
		namedRouter.registerAppHelpers(app);


		this.app.use(this.setLanguageFromCookie.bind(this));
		this.app.use(this.setLanguageFromQueryString.bind(this));

		this.app.use(this.setNavigationForLanguage.bind(this));

		this.registerResHelpers();
		this.registerTemplateHelpers();

		this.generateRoutes();
	},

	//TODO: possibly very crappy
	registerLanguageModel: function () {

		if (this.keystone.lists.Language)
			return;

		var Language = new this.keystone.List('Language', {
			nocreate: true,
			noedit: true
		});

		Language.add({
			name: { type: String, required: true, initial: true },
			key: { type: String, required: true, unique: true, initial: true },
		});

		Language.defaultColumns = 'name, key';
		Language.register();
	},

	registerResHelpers: function () {
		var _this = this;
		this.app.use(function (req, res, next) {
			res.languageRedirect = _this.languageRedirect.bind(_this);
			next();
		});
	},


	registerTemplateHelpers: function () {
		var _this = this;
		this.app.use(function (req, res, next) {
			if(res.locals) {

				res.locals.locale = req.i18n.getLocale();

				//creates a route from its name and parameters in language specified
				res.locals.buildLanguageUrl = function(routeName, params, method) {
					var languageRouteName = req.i18n.getLocale() + '.' + routeName;
					return req.app.namedRoutes.build(languageRouteName, params, method);
				}
			}
			next();
		});
	},

	/**
	 * Sets the language from the cookie if it exists
	 */
	setLanguageFromCookie: function (req, res, next) {
		req.i18n.setLocaleFromCookie();
		next();
	},

	/**
	 * Sets language from query string if it is passed and sets the cookie for it
	 */
	setLanguageFromQueryString: function (req, res, next) {
		var oldLanguage, currentLanguage;

		oldLanguage = currentLanguage = req.i18n.getLocale();

		if(req.query.language) {
			currentLanguage = req.query.language;

			if(oldLanguage != currentLanguage) {
				this.setLanguageAndCookie(req, res, currentLanguage);
				res.locals.languageChange = true;
				res.locals.oldLanguage = oldLanguage;
			}
		}
		next();
	},

	/**
	 * fetch the correct navigation sitemap for current language
	 */
	setNavigationForLanguage: function (req, res, next) {
		res.locals.navLinks = this.getNavigationForLanguage(req.i18n.getLocale());
		next();
	},


	/**
	 * read through the language route map and generate the
	 * dynamic and static routes for each.
	 */
	generateRoutes: function () {
		var languages = ['en', 'de'];

		_(this.languageRouteMap).each((page, routeName) => {
			var routeFn = page.method && 'function' === typeof this.app[page.method]
				? this.app[page.method].bind(this.app)
				: this.app.get.bind(this.app)
			;

			// invariant((typeof page.section !== 'undefined'), "Page section required, can be null");

			if(page.languages) {
				_(languages).each((lang) => {
					var langPage = page.languages[lang];

					if (!langPage)
						return; //No entry for this langauge on this page..??

					invariant(langPage.route, "Each language requires a route to be specified");
					if (page.controller) {
						this.createDynamicRoute(routeFn, lang, routeName, langPage.route, page.controller);
					} else if (page.templatePrefix) {
						var template = page.templatePrefix + '-' + lang;
						this.createStaticRoute(routeFn, lang, routeName, langPage.route, template)

					} else {
						invariant(page.sharedTemplate, "If no controller is passed then either a templatePrefix or a sharedTemplate is expected");
						this.createStaticRoute(routeFn, lang, routeName, langPage.route, page.sharedTemplate)
					}
				});
			} else {
				invariant(
					page.controller && page.route,
					"If no languages are specified, a generic route and controller must be specified"
				);

				//allows all language switching to be done in controller/template (home page)
				this.createDynamicRoute(routeFn, '*', routeName, page.route, page.controller);

			}

		});
	},




	/**
	 * Middleware to run before all routes
	 * Specified as initial handler for all generated routes as it requires access
	 * to req.route.name
	 *
	 * When changing language this will redirect the page to the localised route if
	 * there is such a route matching in the languageRouteMap.
	 *
	 * When not changing language, this will ensure the language is set to the language
	 * of the localised route if specified in the languageRouteMap (and update the nav)
	 */
	languageController: function (req, res, next) {

		if(res.locals.languageChange) {
			this.languageRedirect(req, res, next);
		} else {
			this.setLanguageFromRoute(req, res, next);
		}

	},

	/**
	 * Checks if a route exists for the given request in the current language;
	 * This runs:
	 * 	- 	whenever the language is switched to find a seperate
	 * 	- 	if a view does a lookup for an alternate translation it can update the key parameter
	 * 		and call this again to redirect.
	 */
	languageRedirect: function (req, res, next) {
		var currentRouteName = req.route.name;
		var redirectUrl;
		var routeName = this.getRouteNameForLanguage(req.i18n.getLocale(), currentRouteName);

		if(routeName) {

			if(req.app.namedRoutes.routesByNameAndMethod[routeName]
				&& req.app.namedRoutes.routesByNameAndMethod[routeName][req.method.toLowerCase()]) {

				console.log('REDIRECT', currentRouteName + ' to ' + routeName);
				redirectUrl = req.app.namedRoutes.build(routeName, req.params)
				res.redirect(redirectUrl);
				return;
			} else {

				//no localised route for the content
				console.log('route not available');
				req.flash('info', req.i18n.__('languageRouter.routeNotAvailable'));
				next();
			}
		} else {
			next();
		}
	},

	getRouteLocalsMiddleware: function (routeName) {
		const routeSegments = routeName.split('.');
		return function (req, res, next) {
			res.locals.section = routeSegments[0];
			res.locals.subSection = routeSegments[1];
			next();
		}
	},

	/**
	 * if the route browsed to is from another language than current, insist we're in that language
	 */
	setLanguageFromRoute: function (req, res, next) {
		var currentLang = req.i18n.getLocale();
		var routeLang = this.getLanguageFromRouteName(req.route.name);

		if(routeLang && routeLang !== currentLang) {
			this.setLanguageAndCookie(req, res, currentLang);

			//HACK: (is it hacky?)
			//redo the nav fetch for the new langauge
			res.locals.navLinks = this.getNavigationForLanguage(currentLang);
		}
		next();
	},


	setLanguageAndCookie: function (req, res, language) {
		req.i18n.setLocale(language);
		res.cookie('lang', language, { maxAge: 900000, httpOnly: true });
	},

	getNavigationForLanguage: function (language) {

		invariant(language, "No Language provided");
		invariant(this.languageNavMap[language], "No Language found for " + language);

		return this.languageNavMap[language];
	},

	createDynamicRoute: function (routeFn, lang, routeName, routePath, controller) {
		console.log('DYNAMIC ROUTE', routeName);
		routeFn(
			routePath,
			`${lang}.${routeName}`,
			this.languageController.bind(this),
			this.getRouteLocalsMiddleware(routeName),
			controller
		);
	},

	createStaticRoute: function (routeFn, lang, routeName, routePath, template) {
		console.log('STATIC ROUTE', routeName + ' (with template: ' + template + ')');
		routeFn(
			routePath,
			`${lang}.${routeName}`,
			this.languageController.bind(this),
			this.getRouteLocalsMiddleware(routeName),
			(req, res) => {
				var view = new this.keystone.View(req, res);
				// Render the view to the template
				view.render(template);
			}
		);
	},

	/**
	 * This switches out the first component of the route to specified language
	 * returns null for universal routes (*)
	 */
	getRouteNameForLanguage: function (newLang, routeName) {
		var redirectRouteName;
		var routeSplit = routeName.split('.');

		if('*' === routeSplit[0]) {
			//this is an all language match, return no route
			redirectRouteName = null;
		} else {
			var routeLang = routeSplit.shift();
			routeSplit.unshift(newLang)
			redirectRouteName = routeSplit.join('.');
		}

		return redirectRouteName;
	},

	getLanguageFromRouteName: function (langRouteName) {
		var routeSplit = langRouteName.split('.');
		var language;

		if('*' === routeSplit) {
			language = null;
		} else {
			language = routeSplit.shift();
		}

		return language;
	}
};


//limited public api..
module.exports = exports = function (keystone) {
	var languageRouter = new LanguageRouter(keystone);
	languageRouter.registerLanguageModel();
	return {
		init : languageRouter.init.bind(languageRouter),
	};
};

