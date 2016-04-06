var async = require('async');


var LocaleModel = function() {
	var keystone = LocaleModel.keystone;
	var Types = keystone.Field.Types;
	var model;

	if ('object' === typeof arguments[0] && arguments[0] instanceof keystone.List) {
		model = arguments[0];
	} else {
		model = Object.create(keystone.List.prototype);
		keystone.List.apply(model, arguments);
	}

	model.add({
		language: { type: Types.Relationship, ref: 'Language', index: true, initial: 'en' },
		translation: {type: Types.Relationship, ref: model.key },
	})

	//remove all translation relationships to this post on save or remove
	model.schema.post('save', function(doc) {
		removeTranslationReferences(doc);
	});

	model.schema.post('remove', function (doc) {
		removeTranslationReferences(doc, !!'removing');
	});


	//link the relationship to the translation if set
	model.schema.post('save', addTranslationBackReference);


	function addTranslationBackReference(doc) {

		if (!doc.translation)
			return;

		keystone.list(model.key).model.findOne(doc.translation).exec(function(err, translationDoc) {
			//only add reference/save if not set correctly
			if(!translationDoc.translation || !translationDoc.translation.equals(doc.id)) {
				translationDoc.set('translation', doc);
				translationDoc.save();
			}
		}, function (err) {
			console.log('done creating backref', err);
		});
	}

	function removeTranslationReferences(doc, removing) {
		var args = arguments
		keystone.list(model.key).model.find({'translation': doc}).exec(function(err, result) {
			console.log('translations', result)
			async.each(result, function(translationDoc, done) {

				//only perform operation if necessary
				if(removing || !translationDoc._id.equals(doc.translation)) {
					translationDoc.set('translation', null);
					translationDoc.save();
				}
				done();
			},function (err) {
				console.log('done removing backrefs', err);
			});
		});
	}

	return model;
}

//TODO: tremendously hacky...
module.exports = function (keystone) {
	LocaleModel.keystone = keystone;
	return LocaleModel;
}
