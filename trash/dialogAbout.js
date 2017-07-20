define([
	"jquery",
	"underscore",
	"constants",
	"utils",
	"classes/Extension",
	"text!html/dialogAbout.html"
], function($, _, constants, utils, Extension, dialogAboutHTML) {

	var dialogAbout = new Extension("dialogAbout", 'Dialog "About"');

	dialogAbout.onReady = function() {
		utils.addModal('modal-about', _.template(dialogAboutHTML, {
			version: constants.VERSION
		}));
	};

	return dialogAbout;
});
