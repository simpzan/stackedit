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
        fileDesc.attachments = fileDesc.activeAttachments;
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
