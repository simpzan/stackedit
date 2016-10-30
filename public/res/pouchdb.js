define([
    "PouchDB",
], function(PouchDB) {

    var db = new PouchDB('notes');
    window.db = db;

    function upsert(id, changeCallback) {
        return db.get(id).then(doc => {
            return put(doc);
        }).catch(err => {
            if (err.status === 404) {
                const doc = { _id: id };
                return put(doc);
            } else {
                console.error("unexpected error", err);
                throw err;
            }
        });

        function put(doc) {
            doc._attachments = doc._attachments || {}
            changeCallback(doc);
            return db.put(doc).catch(err => {
                console.error(`failed to put doc`, doc, err);
                throw err;
            });
        }
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

    const pouchdb = {
        saveFile,
        allFiles,
        saveAttachment,
    };
    window.pouchdb = pouchdb;
    return pouchdb;
});
