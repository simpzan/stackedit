define([
    "PouchDB",
    "utils",
], function(PouchDB, utils) {

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
        return upsert(file.fileIndex, doc => {
            doc.title = file.title;
            doc.content = file.content;
            doc.created = file.createTime;
            doc.modified = file.modifyTime;

            if (!file.attachmentsLoaded) return;

            const oldAttachments = doc._attachments;
            doc._attachments = utils.mapObject(file.attachments, (attachment, name) => {
                const old = oldAttachments[name];
                if (old) return old;
                return {
                    content_type: attachment.type,
                    data: attachment
                };
            });
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

    function deleteFile(fileId) {
        return upsert(fileId, doc => {
            doc._deleted = true;
        });
    }

    const pouchdb = {
        saveFile,
        allFiles,
        loadFile,
        deleteFile,
    };
    window.pouchdb = pouchdb;
    return pouchdb;
});
