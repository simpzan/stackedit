define([
	"underscore",
	"utils",
	"storage",
	"pouchdb",
], function(_, utils, storage, pouchdb) {

	const saveFileDebounced = _.debounce((fileDesc) => {
		pouchdb.saveFile(fileDesc);
	}, 5000);
	function saveFile(f) {
		saveFileDebounced(f);
	}

	function FileDescriptor(fileIndex, title, content, syncLocations, publishLocations) {
		this.fileIndex = fileIndex;
		this._title = title || storage[fileIndex + ".title"];
		this._content = content || "";
		this._editorScrollTop = parseInt(storage[fileIndex + ".editorScrollTop"]) || 0;
		this._editorStart = parseInt(storage[fileIndex + ".editorEnd"]) || 0;
		this._editorEnd = parseInt(storage[fileIndex + ".editorEnd"]) || 0;
		this._previewScrollTop = parseInt(storage[fileIndex + ".previewScrollTop"]) || 0;
		this._selectTime = parseInt(storage[fileIndex + ".selectTime"]) || 0;
		this._createTime = parseInt(storage[fileIndex + ".createTime"]) || new Date().getTime();
		this._modifyTime = parseInt(storage[fileIndex + ".modifyTime"]) || new Date().getTime();
		this.attachments = {};
		this._discussionList = JSON.parse(storage[fileIndex + ".discussionList"] || '{}');
		this.syncLocations = syncLocations || {};
		this.publishLocations = publishLocations || {};
		Object.defineProperty(this, 'title', {
			get: function() {
				return this.content.substring(0, 254).split('\n')[0].trim();
			},
			set: function(title) {
				console.error("title property is deprecated, use #Title in markdown file instead");
			}
		});
		Object.defineProperty(this, 'currentRev', {
			get: function() {
				this._currentRevIndex = this._currentRevIndex || 0
				return this._revs[this._currentRevIndex];
			},
			set: function(rev) {
				this._revs[this._currentRevIndex] = rev;
			}
		});
		Object.defineProperty(this, 'content', {
			get: function() {
				return this._content;
			},
			set: function(content) {
				if (content === this.content) return;

				this._content = content;
				saveFile(this);
			}
		});
		Object.defineProperty(this, 'editorScrollTop', {
			get: function() {
				return this._editorScrollTop;
			},
			set: function(editorScrollTop) {
				this._editorScrollTop = editorScrollTop;
				storage[this.fileIndex + ".editorScrollTop"] = editorScrollTop;
			}
		});
		Object.defineProperty(this, 'editorStart', {
			get: function() {
				return this._editorStart;
			},
			set: function(editorStart) {
				this._editorStart = editorStart;
				storage[this.fileIndex + ".editorStart"] = editorStart;
			}
		});
		Object.defineProperty(this, 'editorEnd', {
			get: function() {
				return this._editorEnd;
			},
			set: function(editorEnd) {
				this._editorEnd = editorEnd;
				storage[this.fileIndex + ".editorEnd"] = editorEnd;
			}
		});
		Object.defineProperty(this, 'previewScrollTop', {
			get: function() {
				return this._previewScrollTop;
			},
			set: function(previewScrollTop) {
				this._previewScrollTop = previewScrollTop;
				storage[this.fileIndex + ".previewScrollTop"] = previewScrollTop;
			}
		});
		Object.defineProperty(this, 'selectTime', {
			get: function() {
				return this._selectTime;
			},
			set: function(selectTime) {
				this._selectTime = selectTime;
				storage[this.fileIndex + ".selectTime"] = selectTime;
			}
		});
		Object.defineProperty(this, 'modifyTime', {
			get: function() {
				return this._modifyTime;
			},
			set: function(modifyTime) {
				if (this._modifyTime === modifyTime) return;

				this._modifyTime = modifyTime;
				storage[this.fileIndex + ".modifyTime"] = modifyTime;
				saveFile(this);
			}
		});
		Object.defineProperty(this, 'createTime', {
			get: function() {
				return this._createTime;
			},
			set: function(createTime) {
				this._createTime = createTime;
				storage[this.fileIndex + ".createTime"] = createTime;
			}
		});
		Object.defineProperty(this, 'discussionList', {
			get: function() {
				return this._discussionList;
			},
			set: function(discussionList) {
				this._discussionList = discussionList;
				storage[this.fileIndex + ".discussionList"] = JSON.stringify(discussionList);
			}
		});
		Object.defineProperty(this, 'discussionListJSON', {
			get: function() {
				return storage[this.fileIndex + ".discussionList"] || '{}';
			},
			set: function(discussionList) {
				this._discussionList = JSON.parse(discussionList);
				storage[this.fileIndex + ".discussionList"] = discussionList;
			}
		});
	}

	FileDescriptor.prototype.selectRev = function(rev) {
		const index = this._revs.indexOf(rev);
		if (index === -1) throw new Error(`invalid rev: ${rev}`)
		this._currentRevIndex = index;
	};
	FileDescriptor.prototype.delete = function() {
		this.deleted = true;
		return pouchdb.saveFile(this);
	};

	FileDescriptor.prototype.save = function() {
		return pouchdb.saveFile(this);
	};
	FileDescriptor.prototype.loadAttachments = function() {
		if (this.content === "") return Promise.resolve();

		const self = this;
		return pouchdb.loadFile(this.fileIndex, this.currentRev).then(doc => {
			self.attachments = utils.mapObject(doc._attachments, (attachment) => attachment.data);
			self.attachmentsLoaded = true;
			self._content = doc.content;
		}).catch(err => {
			console.error(`failed to loadAttachments`);
		});
	};

	FileDescriptor.fromDocument = function(doc) {
        const file = new FileDescriptor(doc._id, doc.title, doc.content);
        file._id = doc._id;
        file._rev = doc._rev;
        file._attachments = doc._attachments;
        doc._conflicts = doc._conflicts || [];
        file._revs = [doc._rev].concat(doc._conflicts);
        return file;
	}
	FileDescriptor.prototype.toDocument = function() {
		const doc = {
			_id: this._id,
			_rev: this.currentRev,
			_deleted: this.deleted,
			_attachments: this._attachments,
			title: this.title,
			content: this.content,
			created: this.createTime,
			modified: this.modifyTime
		};

        if (this.attachmentsLoaded) {
	        const oldAttachments = this._attachments;
	        doc._attachments = utils.mapObject(this.attachments, (attachment, name) => {
	            const old = oldAttachments[name];
	            if (old) return old;
	            return {
	                content_type: attachment.type,
	                data: attachment
	            };
	        });
        }
		return doc;
	}

	FileDescriptor.prototype.addSyncLocation = function(syncAttributes) {
		utils.storeAttributes(syncAttributes);
		utils.appendIndexToArray(this.fileIndex + ".sync", syncAttributes.syncIndex);
		this.syncLocations[syncAttributes.syncIndex] = syncAttributes;
	};

	FileDescriptor.prototype.removeSyncLocation = function(syncAttributes) {
		utils.removeIndexFromArray(this.fileIndex + ".sync", syncAttributes.syncIndex);
		delete this.syncLocations[syncAttributes.syncIndex];
	};

	FileDescriptor.prototype.addPublishLocation = function(publishAttributes) {
		utils.storeAttributes(publishAttributes);
		utils.appendIndexToArray(this.fileIndex + ".publish", publishAttributes.publishIndex);
		this.publishLocations[publishAttributes.publishIndex] = publishAttributes;
	};

	FileDescriptor.prototype.removePublishLocation = function(publishAttributes) {
		utils.removeIndexFromArray(this.fileIndex + ".publish", publishAttributes.publishIndex);
		delete this.publishLocations[publishAttributes.publishIndex];
	};

	function addIcon(result, attributes) {
		result.push('<i class="icon-provider-' + attributes.provider.providerId + '"></i>');
	}

	function addSyncIconWithLink(result, attributes) {
		if(attributes.provider.getSyncLocationLink) {
			var syncLocationLink = attributes.provider.getSyncLocationLink(attributes);
			result.push([
				'<a href="',
				syncLocationLink,
				'" target="_blank" title="Open in ',
				attributes.provider.providerName,
				'"><i class="icon-provider-',
				attributes.provider.providerId,
				'"></i><i class="icon-link-ext-alt"></i></a>'
			].join(''));
		}
		else {
			addIcon(result, attributes);
		}
	}

	function addPublishIconWithLink(result, attributes) {
		if(attributes.provider.getPublishLocationLink) {
			var publishLocationLink = attributes.provider.getPublishLocationLink(attributes);
			result.push([
				'<a href="',
				publishLocationLink,
				'" target="_blank" title="Open in ',
				attributes.provider.providerName,
				'"><i class="icon-provider-',
				attributes.provider.providerId,
				'"></i><i class="icon-link-ext-alt"></i></a>'
			].join(''));
		}
		else {
			addIcon(result, attributes);
		}
	}

	FileDescriptor.prototype.composeTitle = function(createLinks) {
		var result = [];
		var addSyncIcon = createLinks ? addSyncIconWithLink : addIcon;
		var addPublishIcon = createLinks ? addPublishIconWithLink : addIcon;
		_.chain(this.syncLocations).sortBy(function(attributes) {
			return attributes.provider.providerId;
		}).each(function(attributes) {
			addSyncIcon(result, attributes);
		});
		if(_.size(this.syncLocations) !== 0) {
			result.push('<i class="icon-refresh title-icon-category"></i>');
		}
		_.chain(this.publishLocations).sortBy(function(attributes) {
			return attributes.provider.providerId;
		}).each(function(attributes) {
			addPublishIcon(result, attributes);
		});
		if(_.size(this.publishLocations) !== 0) {
			result.push('<i class="icon-upload title-icon-category"></i>');
		}
		result.push(_.escape(this.title));
		return result.join('');
	};

	return FileDescriptor;
});
