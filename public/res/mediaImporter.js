define([
	"jquery",
	"underscore",
	"constants",
	"classes/Provider",
	"core",
	"eventMgr",
	"fileMgr",
	"pouchdb",
	"providers/gplusProvider"
], function($, _, constants, Provider, core, eventMgr, fileMgr, pouchdb) {

	var mediaImporter = {};

	// Create a map with providerId: providerModule
	var providerMap = _.chain(arguments).map(function(argument) {
		return argument instanceof Provider && [
			argument.providerId,
			argument
		];
	}).compact().object().value();

	eventMgr.addListener("onReady", function() {
		_.each(providerMap, function(provider) {
			// Import image action links (if any)
			$(".action-import-image-" + provider.providerId).click(function() {
				// Take the insertLinkCallback from core module
				var insertLinkCallback = core.insertLinkCallback;
				// Unset it to be sure core module will not call it
				core.insertLinkCallback = undefined;
				provider.importImage(function(error, imageLink) {
					if(error) {
						insertLinkCallback(null);
						return;
					}
					insertLinkCallback(imageLink || null);
				});
			});
		});

		function handleImgImport(evt) {
			var files = (evt.dataTransfer || evt.target).files;
			var file = _.first(files);
			if (!file.name.match(/.(jpe?g|png|gif)$/i)) return;

			evt.stopPropagation();
			evt.preventDefault();

			const limit = constants.IMPORT_IMG_MAX_CONTENT_SIZE;
			if (file.size > limit) {
				return console.warn(`file too large ${file.name}: ${file.size} > ${limit}`)
			}

			const currentFile = fileMgr.currentFile;
			pouchdb.saveAttachment(currentFile.fileIndex, file).then(result => {
				currentFile.setAttachment(file.name, file);
				insertLink(file.name);
			}).catch(err => {
				console.error("err", err);
			});


			function insertLink(imageLink) {
				// Generate an insertLinkCallback by clicking the
				// pagedown button but without showing the dialog
				core.catchModal = true;
				$("#wmd-image-button").click();
				core.catchModal = false;
				// Take the insertLinkCallback from core module
				var insertLinkCallback = core.insertLinkCallback;
				// Unset it to be sure core module will not call it
				core.insertLinkCallback = undefined;
				insertLinkCallback(imageLink || null);
			}
		}

		function handleDragOver(evt) {
			evt.stopPropagation();
			evt.preventDefault();
			evt.dataTransfer.dropEffect = 'copy';
		}

		!window.viewerMode && (function(dragAndDropElt) {
			dragAndDropElt.addEventListener('dragover', handleDragOver, false);
			dragAndDropElt.addEventListener('drop', handleImgImport, false);
		})(document.querySelector('.layout-wrapper-l3'));

	});

	return mediaImporter;
});
