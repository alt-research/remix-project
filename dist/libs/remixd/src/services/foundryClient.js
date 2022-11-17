"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoundryClient = void 0;
const tslib_1 = require("tslib");
const plugin_1 = require("@remixproject/plugin");
const chokidar = require("chokidar");
const utils = require("../utils");
const fs = require("fs-extra");
const path_1 = require("path");
const { spawn } = require('child_process'); // eslint-disable-line
class FoundryClient extends plugin_1.PluginClient {
    constructor(readOnly = false) {
        super();
        this.readOnly = readOnly;
        this.methods = ['compile', 'sync'];
    }
    setWebSocket(websocket) {
        this.websocket = websocket;
        this.websocket.addEventListener('close', () => {
            this.warnlog = false;
            if (this.watcher)
                this.watcher.close();
        });
    }
    sharedFolder(currentSharedFolder) {
        this.currentSharedFolder = currentSharedFolder;
        this.buildPath = utils.absolutePath('out', this.currentSharedFolder);
        this.cachePath = utils.absolutePath('cache', this.currentSharedFolder);
        this.listenOnFoundryCompilation();
    }
    compile(configPath) {
        return new Promise((resolve, reject) => {
            if (this.readOnly) {
                const errMsg = '[Foundry Compilation]: Cannot compile in read-only mode';
                return reject(new Error(errMsg));
            }
            const cmd = `forge build`;
            const options = { cwd: this.currentSharedFolder, shell: true };
            const child = spawn(cmd, options);
            let result = '';
            let error = '';
            child.stdout.on('data', (data) => {
                const msg = `[Foundry Compilation]: ${data.toString()}`;
                console.log('\x1b[32m%s\x1b[0m', msg);
                result += msg + '\n';
            });
            child.stderr.on('data', (err) => {
                error += `[Foundry Compilation]: ${err.toString()} \n`;
            });
            child.on('close', () => {
                if (error && result)
                    resolve(error + result);
                else if (error)
                    reject(error);
                else
                    resolve(result);
            });
        });
    }
    processArtifact() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const folderFiles = yield fs.readdir(this.buildPath); // "out" folder
            const cache = JSON.parse(yield fs.readFile((0, path_1.join)(this.cachePath, 'solidity-files-cache.json'), { encoding: 'utf-8' }));
            // name of folders are file names
            for (const file of folderFiles) {
                const path = (0, path_1.join)(this.buildPath, file); // out/Counter.sol/
                const compilationResult = {
                    input: {},
                    output: {
                        contracts: {},
                        sources: {}
                    },
                    solcVersion: null,
                    compilationTarget: null
                };
                yield this.readContract(path, compilationResult, cache);
                this.emit('compilationFinished', compilationResult.compilationTarget, { sources: compilationResult.input }, 'soljson', compilationResult.output, compilationResult.solcVersion);
            }
            if (!this.warnlog) {
                // @ts-ignore
                this.call('terminal', 'log', { type: 'log', value: 'receiving compilation result from Foundry' });
                this.warnlog = true;
            }
        });
    }
    listenOnFoundryCompilation() {
        try {
            this.watcher = chokidar.watch(this.cachePath, { depth: 0, ignorePermissionErrors: true, ignoreInitial: true });
            this.watcher.on('change', (f) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () { return this.processArtifact(); }));
            this.watcher.on('add', (f) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () { return this.processArtifact(); }));
            // process the artifact on activation
            setTimeout(() => this.processArtifact(), 1000);
        }
        catch (e) {
            console.log(e);
        }
    }
    readContract(contractFolder, compilationResultPart, cache) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const files = yield fs.readdir(contractFolder);
            for (const file of files) {
                const path = (0, path_1.join)(contractFolder, file);
                const content = yield fs.readFile(path, { encoding: 'utf-8' });
                yield this.feedContractArtifactFile(file, content, compilationResultPart, cache);
            }
        });
    }
    feedContractArtifactFile(path, content, compilationResultPart, cache) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const contentJSON = JSON.parse(content);
            const contractName = (0, path_1.basename)(path).replace('.json', '');
            const currentCache = cache.files[contentJSON.ast.absolutePath];
            if (!currentCache.artifacts[contractName])
                return;
            // extract source and version
            const metadata = contentJSON.metadata;
            if (metadata.compiler && metadata.compiler.version) {
                compilationResultPart.solcVersion = metadata.compiler.version;
            }
            else {
                compilationResultPart.solcVersion = '';
                console.log('\x1b[32m%s\x1b[0m', 'compiler version not found, please update Foundry to the latest version.');
            }
            if (metadata.sources) {
                for (const path in metadata.sources) {
                    const absPath = utils.absolutePath(path, this.currentSharedFolder);
                    try {
                        const content = yield fs.readFile(absPath, { encoding: 'utf-8' });
                        compilationResultPart.input[path] = { content };
                    }
                    catch (e) {
                        compilationResultPart.input[path] = { content: '' };
                    }
                }
            }
            else {
                console.log('\x1b[32m%s\x1b[0m', 'sources input not found, please update Foundry to the latest version.');
            }
            compilationResultPart.compilationTarget = contentJSON.ast.absolutePath;
            // extract data
            if (!compilationResultPart.output['sources'][contentJSON.ast.absolutePath])
                compilationResultPart.output['sources'][contentJSON.ast.absolutePath] = {};
            compilationResultPart.output['sources'][contentJSON.ast.absolutePath] = {
                ast: contentJSON['ast'],
                id: contentJSON['id']
            };
            if (!compilationResultPart.output['contracts'][contentJSON.ast.absolutePath])
                compilationResultPart.output['contracts'][contentJSON.ast.absolutePath] = {};
            contentJSON.bytecode.object = contentJSON.bytecode.object.replace('0x', '');
            contentJSON.deployedBytecode.object = contentJSON.deployedBytecode.object.replace('0x', '');
            compilationResultPart.output['contracts'][contentJSON.ast.absolutePath][contractName] = {
                abi: contentJSON.abi,
                evm: {
                    bytecode: contentJSON.bytecode,
                    deployedBytecode: contentJSON.deployedBytecode,
                    methodIdentifiers: contentJSON.methodIdentifiers
                }
            };
        });
    }
    sync() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            console.log('syncing from Foundry');
            this.processArtifact();
            // @ts-ignore
            this.call('terminal', 'log', { type: 'log', value: 'synced with Foundry' });
        });
    }
}
exports.FoundryClient = FoundryClient;
//# sourceMappingURL=foundryClient.js.map