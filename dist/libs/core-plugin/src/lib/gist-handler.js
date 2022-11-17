/* global fetch */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.GistHandler = void 0;
const tslib_1 = require("tslib");
const engine_1 = require("@remixproject/engine");
const profile = {
    name: 'gistHandler',
    methods: ['load'],
    events: [],
    version: '0.0.1'
};
class GistHandler extends engine_1.Plugin {
    constructor() {
        super(profile);
    }
    handleLoad(gistId, cb) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!cb)
                cb = () => { };
            let loadingFromGist = false;
            if (!gistId) {
                loadingFromGist = true;
                let value;
                try {
                    value = yield (() => {
                        return new Promise((resolve, reject) => {
                            const modalContent = {
                                id: 'gisthandler',
                                title: 'Load a Gist',
                                message: 'Enter the ID of the Gist or URL you would like to load.',
                                modalType: 'prompt',
                                okLabel: 'OK',
                                cancelLabel: 'Cancel',
                                okFn: (value) => {
                                    setTimeout(() => resolve(value), 0);
                                },
                                cancelFn: () => {
                                    setTimeout(() => reject(new Error('Canceled')), 0);
                                },
                                hideFn: () => {
                                    setTimeout(() => reject(new Error('Hide')), 0);
                                }
                            };
                            this.call('notification', 'modal', modalContent);
                        });
                    })();
                }
                catch (e) {
                    // the modal has been canceled
                    return;
                }
                if (value !== '') {
                    gistId = getGistId(value);
                    if (gistId) {
                        cb(gistId);
                    }
                    else {
                        const modalContent = {
                            id: 'gisthandler',
                            title: 'Gist load error',
                            message: 'Error while loading gist. Please provide a valid Gist ID or URL.'
                        };
                        this.call('notification', 'alert', modalContent);
                    }
                }
                else {
                    const modalContent = {
                        id: 'gisthandlerEmpty',
                        title: 'Gist load error',
                        message: 'Error while loading gist. Id cannot be empty.'
                    };
                    this.call('notification', 'alert', modalContent);
                }
                return loadingFromGist;
            }
            else {
                loadingFromGist = !!gistId;
            }
            if (loadingFromGist) {
                cb(gistId);
            }
            return loadingFromGist;
        });
    }
    load(gistId) {
        const self = this;
        return self.handleLoad(gistId, (gistId) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            let data;
            try {
                data = (yield (yield fetch(`https://api.github.com/gists/${gistId}`)).json());
                if (!data.files) {
                    const modalContent = {
                        id: 'gisthandler',
                        title: 'Gist load error',
                        message: data.message,
                        modalType: 'alert',
                        okLabel: 'OK'
                    };
                    yield this.call('notification', 'modal', modalContent);
                    return;
                }
            }
            catch (e) {
                const modalContent = {
                    id: 'gisthandler',
                    title: 'Gist load error',
                    message: e.message
                };
                yield this.call('notification', 'alert', modalContent);
                return;
            }
            const obj = {};
            Object.keys(data.files).forEach((element) => {
                const path = element.replace(/\.\.\./g, '/');
                obj['/gist-' + gistId + '/' + path] = data.files[element];
            });
            this.call('fileManager', 'setBatchFiles', obj, 'workspace', true, (errorSavingFiles) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                if (errorSavingFiles) {
                    const modalContent = {
                        id: 'gisthandler',
                        title: 'Gist load error',
                        message: errorSavingFiles.message || errorSavingFiles
                    };
                    this.call('notification', 'alert', modalContent);
                }
            }));
        }));
    }
}
exports.GistHandler = GistHandler;
const getGistId = (str) => {
    const idr = /[0-9A-Fa-f]{8,}/;
    const match = idr.exec(str);
    return match ? match[0] : null;
};
//# sourceMappingURL=gist-handler.js.map