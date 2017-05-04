#Keystone Multilingual

* Under Development


An opinionated Multilingual Model, Declarative Sitemap, and Redirection Middleware for KeystoneJS

Keystone Multilingual allows for declarative site map building across localized url routes
with mapping between language translations of both static page templates and db models.



###Features

* Declarative route generation with a simple structure allowing for the definition
of both static (template only) and dynamic (db model) driven routes.
* Shared or language-suffixed template per route
* An updated `keystone.List` that include language and translation fields by default allowing
selection of an alternative translation id object of the same model
* Middleware to determine redirection to localised route naming
* Langauge detection from url
* i18n-2 integration
* Url building based on selected language


### Current Limitations / Simplifications

Currently only supports dual languages but I dont belive this will be a tough update.



## API

###keystone.List

Use `keystone.List` with the 'multilingual' option set to true to create a model that is langauge aware.

```javascript
var Post = keystone.List('Post', {
	multilingual: true,
});

```

Whenever objects are created the language is specified and users can select the translation, being another model of the same type.

Saving a translation on an object automatically assigns the translation object's translation as the object you are saving. These are also automatically updated and deleted whenever these events happen.



###The Language Route Map

The primary purpose of the language route map is to specify the sitemap and all it's routes declaring different localised routes for each languauge.  Hitting the langauge change will map the url to the equivalent route for the selected langauge.

The mapping of dynamic content will be stored in the database for each model created by Controllers will be responsible for doing appropriate lookups on any parameters passed in order to retrieve the correct content, redirecting again to get a clean, completely localised url.





###The Language Navigation Map

This is almost arbitrary other than the first level object keys must correlate to the languages used.
Your navigation template must be aware of the structure you use and be able to read it.
Switching languages will automatically grab the correct navigation and assign it to locals.navLinks

#### Templates


Pages can either be static (rendered jade template only), or dynamic (controller specified), this only implied by use of a controller or templates configuration.

Static pages can either specify a 'templatePrefix' to have seperate templates per language (template files suffixed '-en', or '-de', etc), or a 'sharedTemplate'. All templates have access to i18n functions which do lookups on translations listed in /locales/en.js etc, most useful for the shared templates.

So far, dynamic pages share a controller across languages.


#### Navigation

A separate file (routes/langNavMap.js), details the navigation structure for each available language.


### Assumptions to be tested

* Navigation need not be parallel.


### Todo

* linking language versions together in keystone
* Notification that content is not available in alternate language? Flash message?

