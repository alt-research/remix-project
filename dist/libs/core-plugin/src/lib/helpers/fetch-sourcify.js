"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchContractFromSourcify = void 0;
const tslib_1 = require("tslib");
const fetchContractFromSourcify = (plugin, network, contractAddress, targetPath) => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
    let data;
    const compilationTargets = {};
    try {
        data = yield plugin.call('sourcify', 'fetchByNetwork', contractAddress, network.id);
    }
    catch (e) {
        console.log(e);
    }
    if (!data || !data.metadata) {
        return null;
    }
    // set the solidity contract code using metadata
    yield plugin.call('fileManager', 'setFile', `${targetPath}/metadata.json`, JSON.stringify(data.metadata, null, '\t'));
    for (let file in data.metadata.sources) {
        const urls = data.metadata.sources[file].urls;
        for (const url of urls) {
            if (url.includes('ipfs')) {
                const stdUrl = `ipfs://${url.split('/')[2]}`;
                const source = yield plugin.call('contentImport', 'resolve', stdUrl);
                file = file.replace('browser/', ''); // should be fixed in the remix IDE end.
                if (yield plugin.call('contentImport', 'isExternalUrl', file)) {
                    // nothing to do, the compiler callback will handle those
                }
                else {
                    const path = `${targetPath}/${file}`;
                    yield plugin.call('fileManager', 'setFile', path, source.content);
                    compilationTargets[path] = { content: source.content };
                }
                break;
            }
        }
    }
    const settings = {
        version: data.metadata.compiler.version,
        language: data.metadata.language,
        evmVersion: data.metadata.settings.evmVersion,
        optimize: data.metadata.settings.optimizer.enabled,
        runs: data.metadata.settings.optimizer.runs
    };
    return {
        settings,
        compilationTargets
    };
});
exports.fetchContractFromSourcify = fetchContractFromSourcify;
//# sourceMappingURL=fetch-sourcify.js.map