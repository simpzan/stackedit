define([
    "PouchDB",
], function(PouchDB) {

    var db = new PouchDB('notes');
    window.db = db;

    function upsert(id, changeCallback) {
        return db.get(id).catch(err => {
            if (err.status !== 404) throw err;
            return { _id: id };
        }).then(doc => {
            doc._attachments = doc._attachments || {}
            changeCallback(doc);
            return db.put(doc);
        }).catch(err => {
            console.error(`failed to upsert doc`, err);
            throw err;
        });
    }

    function saveFile(file) {
        return upsert(file.fileIndex, function(doc) {
            doc.title = file.title;
            doc.content = file.content;
            doc.created = file.createTime;
            doc.modified = file.modifyTime;
        });
    }

    function allFiles() {
        return db.allDocs({ include_docs: true }).then(result => {
            return result.rows.map(row => row.doc);
        });
    }

    function saveAttachment(fileId, attachment) {
        return upsert(fileId, function(doc) {
            doc._attachments[attachment.name] = {
                content_type: attachment.type,
                data: attachment
            };
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
        saveAttachment,
        loadFile,
    };
    window.pouchdb = pouchdb;
    return pouchdb;
});
