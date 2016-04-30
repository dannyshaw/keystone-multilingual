var keystone = require('keystone');

exports = module.exports = function(req, res) {

	var view = new keystone.View(req, res);
	var locals = res.locals;

	// Set locals
	locals.section = 'language';

	// Load the galleries by sortOrder
	view.query('languages', keystone.list('Language').model.find());

	// Render the view
	view.render('language');

};
