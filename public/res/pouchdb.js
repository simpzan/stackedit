define([
    "PouchDB",
    "utils",
], function(PouchDB, utils) {

    var db = new PouchDB('notes');
    window.db = db;

    function saveFile(file) {
        const doc = file.toDocument();
        console.info("saveFile", doc);
        return db.put(doc, {force:true}).then(result => {
            file.currentRev = result.rev;
            return result;
        });
    }

    function allFiles() {
        return db.allDocs({ include_docs: true, conflicts: true }).then(result => {
            return result.rows.map(row => row.doc);
        });
    }

    function loadFile(fileId, rev) {
        return db.get(fileId, { rev, attachments: true, binary: true }).catch(err => {
            console.error("failed to loadFile", err);
            throw err;
        });
    }

    function sync() {
        const log = console.log.bind(console, 'pouchdb');
        const options = { live: true, since: 'now', include_docs: true, conflicts: true };
        const changesListener = db.changes(options).on('error', err => {
            log('changes error', err);
        });
        const syncHandler = db.sync('http://localhost:5984/notes').on('denied', err => {
            log('sync denied', err)
        }).on('complete', info => {
            log('sync complete', info)
            changesListener.cancel();
        }).on('error', err => {
            log('sync error', err)
        });

        changesListener.stop = function() {
            syncHandler.cancel();
        }
        return changesListener;
    }

    const pouchdb = {
        saveFile,
        allFiles,
        loadFile,
        sync,
    };
    window.pouchdb = pouchdb;
    return pouchdb;
});
