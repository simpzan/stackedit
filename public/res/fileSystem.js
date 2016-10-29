define([
    "underscore",
    "utils",
    "classes/FileDescriptor",
    "storage",
    "pouchdb"
], function(_, utils, FileDescriptor, storage, pouchdb) {
    var fileSystem = {};

    // // Retrieve file descriptors from localStorage
    // utils.retrieveIndexArray("file.list").forEach(function(fileIndex) {
    //     fileSystem[fileIndex] = new FileDescriptor(fileIndex);
    // });

    // // Clean fields from deleted files in local storage
    // Object.keys(storage).forEach(function(key) {
    //     var match = key.match(/(file\.\S+?)\.\S+/);
    //     if(match && !fileSystem.hasOwnProperty(match[1])) {
    //         storage.removeItem(key);
    //     }
    // });

    function loadFiles(callback) {
        pouchdb.allFiles().then(files => {
            files.forEach(f => {
                fileSystem[f._id] = new FileDescriptor(f._id, f.title, f.content);
            });
            console.log("fileSystem ready");
            callback(null);
        }).catch(err => {
            console.error("load files failed", err);
            callback(err);
        });
    }

    const proxy = new Proxy(fileSystem, {
        get(target, key, receiver) {
            if (key === 'loadFiles__') return loadFiles;
            return Reflect.get(target, key);
        }
    })
    return proxy;
});
