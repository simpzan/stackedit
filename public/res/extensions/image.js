define([
    "jquery",
    "underscore",
    "utils",
    "classes/Extension",
    "fileSystem",
    "settings",
], function($, _, utils, Extension, fileSystem, settings) {

    var image = new Extension("image", "image extension", true);

    var fileMgr;
    image.onFileMgrCreated = function(fileMgrParameter) {
        fileMgr = fileMgrParameter;
    };

    image.onFileClosed = function(fileDesc) {
        if (fileDesc.deleted) return;

        const active = fileDesc.activeAttachments;
        const diff = _.difference(Object.keys(fileDesc.attachments), Object.keys(active));
        if (diff.length === 0) return;

        fileDesc.attachments = active;
        fileDesc.save().catch(err => {
            console.error(`failed to save doc`, err);
        });
    };

    image.onPagedownConfigure = function(editor) {
        editor.getConverter().hooks.chain("postConversion", function(html) {
            const activeAttachments = {};
            const attachments = fileMgr.currentFile.attachments;
            var out = html.replace(/<img[^>]*src=\"(.*?)\"[^>]*>/g, function(match, url) {
                const image = attachments[url];
                if (!image) return match;
                activeAttachments[url] = image;
                return match.replace(url, URL.createObjectURL(image));
            });
            fileMgr.currentFile.activeAttachments = activeAttachments;
            return out;
        });
    };

    return image;
});
