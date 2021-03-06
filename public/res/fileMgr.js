define([
	"jquery",
	"underscore",
	"constants",
	"core",
	"utils",
	"mousetrap",
	"storage",
	"settings",
	"eventMgr",
	"fileSystem",
	"pouchdb",
	"classes/FileDescriptor",
	"text!WELCOME.md"
], function($, _, constants, core, utils, mousetrap, storage, settings, eventMgr, fileSystem, pouchdb, FileDescriptor, welcomeContent) {

	var fileMgr = {};

	// Defines the current file
	fileMgr.currentFile = undefined;

	// Set the current file and refresh the editor
	fileMgr.selectFile = function(fileDesc) {
		fileDesc = fileDesc || fileMgr.currentFile;

		if(fileDesc === undefined) {
			var fileSystemSize = _.size(fileSystem);
			if(fileSystemSize === 0) {
				// If fileSystem empty create one file
				fileDesc = fileMgr.createFile(constants.WELCOME_DOCUMENT_TITLE, welcomeContent);
			}
			else {
				// Select the last selected file
				fileDesc = _.max(fileSystem, function(fileDesc) {
					return fileDesc.selectTime || 0;
				});
			}
		}

		fileDesc.loadAttachments().then(() => {
			if(fileMgr.currentFile !== fileDesc) {
				fileMgr.currentFile = fileDesc;
				fileDesc.selectTime = new Date().getTime();

				// Notify extensions
				eventMgr.onFileSelected(fileDesc);

				// Hide the viewer pencil button
				$(".action-edit-document").toggleClass("hide", fileDesc.fileIndex != constants.TEMPORARY_FILE_INDEX);
			}

			// Refresh the editor (even if it's the same file)
			core.initEditor(fileDesc);
		});
	};

	fileMgr.createFile = function(title, content, discussionListJSON, syncLocations, isTemporary) {
		content = content !== undefined ? content : settings.defaultContent;
		if(!title) {
			// Create a file title
			title = constants.DEFAULT_FILE_TITLE;
			var indicator = 2;
			var checkTitle = function(fileDesc) {
				return fileDesc.title == title;
			};
			while(_.some(fileSystem, checkTitle)) {
				title = constants.DEFAULT_FILE_TITLE + indicator++;
			}
		}

		// Generate a unique fileIndex
		var fileIndex = constants.TEMPORARY_FILE_INDEX;
		if(!isTemporary) {
			do {
				fileIndex = "file." + utils.id();
			} while(_.has(fileSystem, fileIndex));
		}

		// syncIndex associations
		syncLocations = syncLocations || {};
		var sync = _.reduce(syncLocations, function(sync, syncAttributes) {
			utils.storeAttributes(syncAttributes);
			return sync + syncAttributes.syncIndex + ";";
		}, ";");

		storage[fileIndex + ".sync"] = sync;
		storage[fileIndex + ".publish"] = ";";

		// Create the file descriptor
		var fileDesc = new FileDescriptor(fileIndex, title, content, syncLocations);

		discussionListJSON && (fileDesc.discussionListJSON = discussionListJSON);

		// Add the index to the file list
		if(!isTemporary) {
			utils.appendIndexToArray("file.list", fileIndex);
			fileSystem[fileIndex] = fileDesc;
			eventMgr.onFileCreated(fileDesc);
		}
		return fileDesc;
	};

	fileMgr.deleteFile = function(fileDesc) {
		fileDesc = fileDesc || fileMgr.currentFile;

		fileDesc.delete().then(() => {
			// Unassociate file from folder
			if(fileDesc.folder) {
				fileDesc.folder.removeFile(fileDesc);
				eventMgr.onFoldersChanged();
			}

			// Remove the index from the file list
			utils.removeIndexFromArray("file.list", fileDesc.fileIndex);
			delete fileSystem[fileDesc.fileIndex];

			// Don't bother with fields in localStorage, they will be removed on next page load
			if(fileMgr.currentFile === fileDesc) {
				// Unset the current fileDesc
				fileMgr.currentFile = undefined;
				// Refresh the editor with another file
				fileMgr.selectFile();
			}

			eventMgr.onFileDeleted(fileDesc);
		}).catch(err => {
			const hint = `failed to delete the doc ${fileDesc.title}`;
			console.error(hint, err);
			eventMgr.onError(hint);
		});
	};

	// Get the file descriptor associated to a syncIndex
	fileMgr.getFileFromSyncIndex = function(syncIndex) {
		return _.find(fileSystem, function(fileDesc) {
			return _.has(fileDesc.syncLocations, syncIndex);
		});
	};

	// Get the file descriptor associated to a publishIndex
	fileMgr.getFileFromPublishIndex = function(publishIndex) {
		return _.find(fileSystem, function(fileDesc) {
			return _.has(fileDesc.publishLocations, publishIndex);
		});
	};

	mousetrap.bind("ctrl+s", function() {
        const handler = pouchdb.sync();
        handler.on('change', change => {
            console.log("change", change)
            const doc = change.doc;
            if (doc._deleted) {
            	delete fileSystem[doc._id];
            } else {
            	const file = FileDescriptor.fromDocument(doc);
            	fileSystem[doc._id] = file;
            }
            if (fileMgr.currentFile.fileIndex === doc._id) {
                fileMgr.currentFile = undefined;
                fileMgr.selectFile();
            }
            if (doc._conflicts && doc._conflicts.length > 0) {
                console.log("conflicts", doc)
            }
        });
   	});

	eventMgr.addListener("onReady", function() {
		var $editorElt = $("#wmd-input");
		fileMgr.selectFile();

		$(".action-create-file").click(function() {
			setTimeout(function() {
				var fileDesc = fileMgr.createFile();
				fileMgr.selectFile(fileDesc);
			}, 400);
		});
		mousetrap.bind(['ctrl+n', 'mod+n'], function() {
			$(".action-create-file").trigger('click');
		});

		$('.action-remove-file-confirm').click(function() {
			$('.modal-remove-file-confirm').modal('show');
		});
		$(".action-remove-file").click(function() {
			fileMgr.deleteFile();
		});
		$(".action-open-stackedit").click(function() {
			window.location.href = "editor";
		});
		$(".action-edit-document").click(function() {
			var content = $editorElt.val();
			var title = fileMgr.currentFile.title;
			var fileDesc = fileMgr.createFile(title, content);
			fileMgr.selectFile(fileDesc);
			window.location.href = "editor";
		});
		$(".action-welcome-file").click(function() {
			var fileDesc = fileMgr.createFile(constants.WELCOME_DOCUMENT_TITLE, welcomeContent);
			fileMgr.selectFile(fileDesc);
		});
	});

	eventMgr.onFileMgrCreated(fileMgr);
	window.fileMgr = fileMgr;
	return fileMgr;
});
