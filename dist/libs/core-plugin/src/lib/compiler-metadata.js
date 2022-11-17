'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerMetadata = void 0;
const tslib_1 = require("tslib");
const engine_1 = require("@remixproject/engine");
const remix_solidity_1 = require("@remix-project/remix-solidity");
const crypto_1 = require("crypto");
const profile = {
    name: 'compilerMetadata',
    methods: ['deployMetadataOf'],
    events: [],
    version: '0.0.1'
};
class CompilerMetadata extends engine_1.Plugin {
    constructor() {
        super(profile);
        this.networks = ['VM:-', 'main:1', 'ropsten:3', 'rinkeby:4', 'kovan:42', 'goerli:5', 'Custom'];
        this.innerPath = 'artifacts';
        this.buildInfoNames = {};
    }
    _JSONFileName(path, contractName) {
        return this.joinPath(path, this.innerPath, contractName + '.json');
    }
    _MetadataFileName(path, contractName) {
        return this.joinPath(path, this.innerPath, contractName + '_metadata.json');
    }
    onActivation() {
        const self = this;
        this.on('solidity', 'compilationFinished', (file, source, languageVersion, data, input, version) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!(yield this.call('settings', 'get', 'settings/generate-contract-metadata')))
                return;
            const compiler = new remix_solidity_1.CompilerAbstract(languageVersion, data, source, input);
            const path = self._extractPathOf(source.target);
            yield this.setBuildInfo(version, input, data, path, file);
            compiler.visitContracts((contract) => {
                if (contract.file !== source.target)
                    return;
                (() => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                    const fileName = self._JSONFileName(path, contract.name);
                    const content = (yield this.call('fileManager', 'exists', fileName)) ? yield this.call('fileManager', 'readFile', fileName) : null;
                    yield this._setArtefacts(content, contract, path);
                }))();
            });
        }));
    }
    // Access each file in build-info, check the input sources
    // If they are all same as in current compiled file and sources includes the path of compiled file, remove old build file
    removeStoredBuildInfo(currentInput, path, filePath) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const buildDir = this.joinPath(path, this.innerPath, 'build-info/');
            if (yield this.call('fileManager', 'exists', buildDir)) {
                const allBuildFiles = yield this.call('fileManager', 'fileList', buildDir);
                const currentInputFileNames = Object.keys(currentInput.sources);
                for (const fileName of allBuildFiles) {
                    let fileContent = yield this.call('fileManager', 'readFile', fileName);
                    fileContent = JSON.parse(fileContent);
                    const inputFiles = Object.keys(fileContent.input.sources);
                    const inputIntersection = currentInputFileNames.filter(element => !inputFiles.includes(element));
                    if (inputIntersection.length === 0 && inputFiles.includes(filePath))
                        yield this.call('fileManager', 'remove', fileName);
                }
            }
        });
    }
    setBuildInfo(version, input, output, path, filePath) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            input = JSON.parse(input);
            const solcLongVersion = version.replace('.Emscripten.clang', '');
            const solcVersion = solcLongVersion.substring(0, solcLongVersion.indexOf('+commit'));
            const format = 'hh-sol-build-info-1';
            const json = JSON.stringify({
                _format: format,
                solcVersion,
                solcLongVersion,
                input
            });
            const id = (0, crypto_1.createHash)('md5').update(Buffer.from(json)).digest().toString('hex');
            const buildFilename = this.joinPath(path, this.innerPath, 'build-info/' + id + '.json');
            // If there are no file in buildInfoNames,it means compilation is running first time after loading Remix
            if (!this.buildInfoNames[filePath]) {
                // Check the existing build-info and delete all the previous build files for compiled file
                yield this.removeStoredBuildInfo(input, path, filePath);
                this.buildInfoNames[filePath] = buildFilename;
                const buildData = { id, _format: format, solcVersion, solcLongVersion, input, output };
                yield this.call('fileManager', 'writeFile', buildFilename, JSON.stringify(buildData, null, '\t'));
            }
            else if (this.buildInfoNames[filePath] && this.buildInfoNames[filePath] !== buildFilename) {
                yield this.call('fileManager', 'remove', this.buildInfoNames[filePath]);
                this.buildInfoNames[filePath] = buildFilename;
                const buildData = { id, _format: format, solcVersion, solcLongVersion, input, output };
                yield this.call('fileManager', 'writeFile', buildFilename, JSON.stringify(buildData, null, '\t'));
            }
        });
    }
    _extractPathOf(file) {
        const reg = /(.*)(\/).*/;
        const path = reg.exec(file);
        return path ? path[1] : '/';
    }
    _setArtefacts(content, contract, path) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            content = content || '{}';
            const fileName = this._JSONFileName(path, contract.name);
            const metadataFileName = this._MetadataFileName(path, contract.name);
            let metadata;
            try {
                metadata = JSON.parse(content);
            }
            catch (e) {
                console.log(e);
            }
            const deploy = metadata.deploy || {};
            this.networks.forEach((network) => {
                deploy[network] = this._syncContext(contract, deploy[network] || {});
            });
            let parsedMetadata;
            try {
                parsedMetadata = contract.object && contract.object.metadata ? JSON.parse(contract.object.metadata) : null;
            }
            catch (e) {
                console.log(e);
            }
            if (parsedMetadata)
                yield this.call('fileManager', 'writeFile', metadataFileName, JSON.stringify(parsedMetadata, null, '\t'));
            const data = {
                deploy,
                data: {
                    bytecode: contract.object.evm.bytecode,
                    deployedBytecode: contract.object.evm.deployedBytecode,
                    gasEstimates: contract.object.evm.gasEstimates,
                    methodIdentifiers: contract.object.evm.methodIdentifiers
                },
                abi: contract.object.abi
            };
            yield this.call('fileManager', 'writeFile', fileName, JSON.stringify(data, null, '\t'));
            this.emit('artefactsUpdated', fileName, contract);
        });
    }
    _syncContext(contract, metadata) {
        let linkReferences = metadata.linkReferences;
        let autoDeployLib = metadata.autoDeployLib;
        if (!linkReferences)
            linkReferences = {};
        if (autoDeployLib === undefined)
            autoDeployLib = true;
        for (const libFile in contract.object.evm.bytecode.linkReferences) {
            if (!linkReferences[libFile])
                linkReferences[libFile] = {};
            for (const lib in contract.object.evm.bytecode.linkReferences[libFile]) {
                if (!linkReferences[libFile][lib]) {
                    linkReferences[libFile][lib] = '<address>';
                }
            }
        }
        metadata.linkReferences = linkReferences;
        metadata.autoDeployLib = autoDeployLib;
        return metadata;
    }
    deployMetadataOf(contractName, fileLocation) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            let path;
            if (fileLocation) {
                path = fileLocation.split('/');
                path.pop();
                path = path.join('/');
            }
            else {
                try {
                    path = this._extractPathOf(yield this.call('fileManager', 'getCurrentFile'));
                }
                catch (err) {
                    console.log(err);
                    throw new Error(err);
                }
            }
            try {
                const { id, name } = yield this.call('network', 'detectNetwork');
                const fileName = this._JSONFileName(path, contractName);
                try {
                    const content = yield this.call('fileManager', 'readFile', fileName);
                    if (!content)
                        return null;
                    let metadata = JSON.parse(content);
                    metadata = metadata.deploy || {};
                    return metadata[name + ':' + id] || metadata[name] || metadata[id] || metadata[name.toLowerCase() + ':' + id] || metadata[name.toLowerCase()];
                }
                catch (err) {
                    return null;
                }
            }
            catch (err) {
                console.log(err);
                throw new Error(err);
            }
        });
    }
    joinPath(...paths) {
        paths = paths.filter((value) => value !== '').map((path) => path.replace(/^\/|\/$/g, '')); // remove first and last slash)
        if (paths.length === 1)
            return paths[0];
        return paths.join('/');
    }
}
exports.CompilerMetadata = CompilerMetadata;
//# sourceMappingURL=compiler-metadata.js.map