var async = require('async');

var TranslatableList = function() {
	var keystone = TranslatableList.keystone;
	var Types = keystone.Field.Types;
	var model = Object.create(keystone._List.prototype);

	keystone._List.apply(model, arguments);

	// if it's not specified as a multtlingual list then return normal list
	var options = arguments[1];
	if (!options || typeof options !== 'object' || !options.multilingual) {
		return model;
	}

	// ok let's add in multilingual functionality
	// specifying a language, and a translation that points to itself
	model.add({
		language: { type: Types.Relationship, ref: 'Language', index: true, initial: 'en' },
		translation: {
			type: Types.Relationship,
			ref: model.key,
			filter: {
				inverted: {
					language: ':language',
					_id: ':_id',
				},
			},
		},
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

		console.log("Processing " + doc.title + " to apply back refereces")


		if (!doc.translation)
			return;


		keystone.list(model.key).model.findOne(doc.translation).exec(function(err, translationDoc) {
			if (!translationDoc) {
				return;
			}
			console.log("Applying back reference from " + translationDoc.title + " to " + doc.title);
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
		console.log("Removing all translation references to " + doc.title);

		var args = arguments
		keystone.list(model.key).model.find({'translation': doc}).exec(function(err, result) {
			async.each(result, function(translationDoc, done) {
				// console.log("Removing all translation references for " + translationDoc.title + "to " + doc.title);
				//only perform operation if necessary
				if(removing || !translationDoc.equals(doc.translation)) {
					translationDoc.set('translation', null);
					translationDoc.save();
				}
				done();
			},function (err) {
				// console.log('Done removing translation references', err);
			});
		});
	}

	return model;
}

//TODO: tremendously hacky...
module.exports = function (keystone) {
	TranslatableList.keystone = keystone;
	return TranslatableList;
}
