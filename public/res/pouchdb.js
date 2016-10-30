define([
    "PouchDB",
], function(PouchDB) {

    var db = new PouchDB('notes');
    window.db = db;

    function getDocRev(id) {
        return db.get(id).then(result => result._rev).catch(err => null);
    }

    function saveFile(fileDesc) {
        const note = {
            _id: fileDesc.fileIndex,
            title: fileDesc.title,
            content: fileDesc.content,
            created: fileDesc.createTime,
            modified: fileDesc.modifyTime
        };
        console.log("saving note:", note);
        return getDocRev(note._id).then(rev => {
            note._rev = rev;
            return db.put(note);
        }).then(result => {
            console.log(result);
        }).catch(err => {
            console.err(err);
        });
    }

    function allFiles() {
        return db.allDocs({ include_docs: true }).then(result => {
            return result.rows.map(row => row.doc);
        });
    }

    function saveAttachment(fileId, attachment) {
        return getDocRev(fileId).then(rev => {
            return db.putAttachment(fileId, attachment.name, rev, attachment, attachment.type);
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
