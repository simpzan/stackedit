define([
    "PouchDB",
    "utils",
], function(PouchDB, utils) {

    var db = new PouchDB('notes');
    window.db = db;

    function saveFile(file) {
        return db.put(file.toDocument()).then(result => {
            file._rev = result.rev;
            return result;
        });
    }

    function allFiles() {
        return db.allDocs({ include_docs: true }).then(result => {
            return result.rows.map(row => row.doc);
        });
    }

    function loadFile(fileId) {
        return db.get(fileId, { attachments: true, binary: true }).catch(err => {
            console.error("failed to loadFile", err);
            throw err;
        });
    }

    const pouchdb = {
        saveFile,
        allFiles,
        loadFile,
    };
    window.pouchdb = pouchdb;
    return pouchdb;
});
