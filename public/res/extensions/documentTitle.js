define([
    "jquery",
    "underscore",
    "crel",
    "classes/Extension"
], function($, _, crel, Extension) {

    var documentTitle = new Extension("documentTitle", "Document Title");

    var fileDesc;
    var $fileTitleNavbar;
    var updateTitle = _.debounce(function(fileDescParameter) {
        if(fileDescParameter !== fileDesc) {
            return;
        }

        var title = fileDesc.currentRev;
        $fileTitleNavbar.html(_.escape(title));

    }, 50);

    documentTitle.onFileSelected = function(fileDescParameter) {
        fileDesc = fileDescParameter;
        updateTitle(fileDescParameter);
    };

    var fileMgr;
    documentTitle.onFileMgrCreated = function(mgr) {
        fileMgr = mgr;
    };

    documentTitle.onTitleChanged = updateTitle;
    documentTitle.onSyncExportSuccess = updateTitle;
    documentTitle.onSyncRemoved = updateTitle;
    documentTitle.onNewPublishSuccess = updateTitle;
    documentTitle.onPublishRemoved = updateTitle;
    documentTitle.onReady = updateTitle;

    documentTitle.onReady = function() {
        var dropdownElt = crel('ul', {
            class: 'dropdown-menu dropdown-file-selector'
        });
        const documentSelectorContainer = crel(
            'div',
            crel('div', {'data-toggle': 'dropdown'}),
            dropdownElt);
        document.querySelector('.navbar').appendChild(documentSelectorContainer);

        var $dropdownElt = $(dropdownElt).dropdown();
        $fileTitleNavbar = $(".file-title-navbar");
        $fileTitleNavbar.click(function() {
            const revs = fileDesc._revs;
            dropdownElt.innerHTML = revs.map(rev => `<li>${rev}</li>`).join("");
            setTimeout(function() { // hack: toggle not work in this loop iteration.
                $dropdownElt.dropdown('toggle');
            }, 0);
            updateTitle(fileDesc);
        });
        $dropdownElt.on('click', 'li', function(event) {
            const rev = event.target.textContent;
            console.log("rev", rev);
            const currentFile = fileMgr.currentFile;
            currentFile.selectRev(rev)
            fileMgr.selectFile(currentFile);
            updateTitle(currentFile);
        });

        // // Add a scrolling effect on hover
        // $fileTitleNavbar.hover(function() {
        //     var scrollLeft = $fileTitleNavbar[0].scrollWidth - $fileTitleNavbar.outerWidth();
        //     $fileTitleNavbar.stop(true, true).animate({
        //             scrollLeft: scrollLeft
        //         }, scrollLeft * 15, 'linear');
        // }, function() {
        //     $fileTitleNavbar.stop(true, true).scrollLeft(0);
        // }).click(function() {
        //     $fileTitleNavbar.stop(true, true).scrollLeft(0);
        // });
    };

    return documentTitle;

});
