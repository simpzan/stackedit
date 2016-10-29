define([
    "jquery",
    "underscore",
    "utils",
    "classes/Extension",
    "fileSystem",
], function($, _, utils, Extension, fileSystem) {

    var documentPanel = new Extension("documentPanel", 'Document Panel');

    var fileMgr;
    documentPanel.onFileMgrCreated = function(fileMgrParameter) {
        fileMgr = fileMgrParameter;
    };

    var folderEltTmpl = [
        '<a href="#"',
        ' class="list-group-item folder clearfix"',
        ' data-folder-index="<%= folderDesc.folderIndex %>"',
        ' data-toggle="collapse"',
        ' data-target=".file-list.<%= id %>">',
        '   <div class="pull-right file-count">',
        '       <%= _.size(folderDesc.fileList) %>',
        '   </div>',
        '   <i class="icon-folder"></i> <%= folderDesc.name %>',
        '</a>',
        '<div class="file-list collapse <%= id %> clearfix">',
        '   <%= fileListHtml %>',
        '</div>'
    ].join('');
    var documentEltTmpl = [
        '<a href="#"',
        ' class="list-group-item file<%= fileDesc === selectedFileDesc ? " active" : "" %>"',
        ' data-file-index="<%= fileDesc.fileIndex %>">',
        '   <%= fileDesc.composeTitle() %>',
        '</a>',
    ].join('');

    var panelElt;
    var $filterInputElt;
    var documentListFilteredElt;
    var $documentListFilteredElt;
    var selectedFileDesc;
    var refreshPanel = _.debounce(function() {
        var documentListFilteredHtml = _.values(fileSystem).sort(function(f1, f2) {
            return f2.modifyTime - f1.modifyTime;
        }).reduce(function(result, fileDesc) {
            return result + '<li>' + _.template(documentEltTmpl, {
                fileDesc: fileDesc,
                selectedFileDesc: selectedFileDesc
            }) + '</li>';
        }, '');
        documentListFilteredHtml = '<ul class="nav">' + documentListFilteredHtml + '</ul>';
        documentListFilteredElt.innerHTML = documentListFilteredHtml;

        filterFiles($filterInputElt.val());
    }, 50);

    documentPanel.onFileSelected = function(fileDesc) {
        selectedFileDesc = fileDesc;
        refreshPanel();
    };

    documentPanel.onFileCreated = refreshPanel;
    documentPanel.onFileDeleted = refreshPanel;
    documentPanel.onTitleChanged = refreshPanel;
    documentPanel.onSyncExportSuccess = refreshPanel;
    documentPanel.onSyncRemoved = refreshPanel;
    documentPanel.onNewPublishSuccess = refreshPanel;
    documentPanel.onPublishRemoved = refreshPanel;
    documentPanel.onFoldersChanged = refreshPanel;

    var filteredFiles = [];
    // Filter for search input in file selector
    var panelContentElt;
    var previousFilterValue = '';
    function filterFiles(filterValue) {
        // Scroll to top
        panelContentElt.scrollTop = 0;

        var wordList = filterValue.toLowerCase().split(/\s+/);
        filteredFiles = _.values(fileSystem).sort(function(f1, f2) {
            return f2.modifyTime - f1.modifyTime;
        }).filter(file => {
            var title = file.title.toLowerCase();
            var titleMatched = wordList.every(word => title.indexOf(word) !== -1);
            var content = file.content.toLowerCase();
            var contentMatched = wordList.every(word => content.indexOf(word) !== -1);
            return titleMatched || contentMatched;
        });

        _.each(documentListFilteredElt.querySelectorAll('.file'), function(fileElt) {
            var $fileElt = $(fileElt);
            var fileIndex = $fileElt.data('fileIndex');
            var matched = filteredFiles.find(file => file.fileIndex === fileIndex);
            $fileElt.toggle(!!matched);
        });
    }

    documentPanel.onReady = function() {
        panelElt = document.querySelector('.document-panel');
        panelContentElt = panelElt.querySelector('.panel-content');
        documentListFilteredElt = panelElt.querySelector('.document-list-filtered');
        $documentListFilteredElt = $(documentListFilteredElt);

        // Open current folder before opening
        $(panelElt).on('show.layout.toggle', function() {
            refreshPanel();
        }).on('shown.layout.toggle', function() {
            // Scroll to the active file
            var activeElt = documentListFilteredElt.querySelector('.file.active');
            activeElt && (panelContentElt.scrollTop += activeElt.getBoundingClientRect().top - 240);
            $filterInputElt.focus();
        }).on('hidden.layout.toggle', function() {
            // Unset the filter
            $filterInputElt.val('');
            filterFiles('');
        }).on('click', '.file', function() {
            var $fileElt = $(this);
            var fileDesc = fileSystem[$fileElt.data('fileIndex')];
            if(fileDesc && fileDesc !== selectedFileDesc) {
                fileMgr.selectFile(fileDesc);
            }
        });

        // Search bar input change
        $filterInputElt = $(panelElt.querySelector('.search-bar .form-control'));
        $filterInputElt.bind("propertychange keyup input paste", function() {
            filterFiles($filterInputElt.val());
        });
        $filterInputElt.bind("keydown", function(event) {
            var upKey = 38, downKey = 40, enterKey = 13;
            var keyCode = event.keyCode;
            if (keyCode == upKey) {
                selectNextFile(-1);
            } else if (keyCode === downKey) {
                selectNextFile(1);
            } else if (keyCode === enterKey) {
                fileMgr.selectFile(selectedFileDesc);
            }
            $filterInputElt.focus();
        });

    };

    function selectNextFile(direction) {
        var current = filteredFiles.indexOf(selectedFileDesc);
        var next = current === -1 ? 0 : current + direction;
        var result = filteredFiles[next];
        if (result) {
            documentPanel.onFileSelected(result);
        } else {
            console.log("no file next");
        }
    }

    return documentPanel;

});
