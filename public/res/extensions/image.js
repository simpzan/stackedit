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

    image.onPagedownConfigure = function(editor) {
        editor.getConverter().hooks.chain("postConversion", function(html) {
            var out = html.replace(/<img[^>]*src=\"(.*?)\"[^>]*>/g, function(match, url) {
                const newUrl = fileMgr.currentFile.getAttachment(url);
                return newUrl ? match.replace(url, newUrl) : match;
            });
            return out;
        });
    };

    return image;
});
