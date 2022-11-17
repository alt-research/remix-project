"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruffleClient = void 0;
const tslib_1 = require("tslib");
const plugin_1 = require("@remixproject/plugin");
const chokidar = require("chokidar");
const utils = require("../utils");
const fs = require("fs-extra");
const path_1 = require("path");
const { spawn } = require('child_process'); // eslint-disable-line
class TruffleClient extends plugin_1.PluginClient {
    constructor(readOnly = false) {
        super();
        this.readOnly = readOnly;
        this.methods = ['compile', 'sync'];
    }
    setWebSocket(websocket) {
        this.websocket = websocket;
        this.websocket.addEventListener('close', () => {
            this.warnLog = false;
            if (this.watcher)
                this.watcher.close();
        });
    }
    sharedFolder(currentSharedFolder) {
        this.currentSharedFolder = currentSharedFolder;
        this.buildPath = utils.absolutePath('build/contracts', this.currentSharedFolder);
        this.listenOnTruffleCompilation();
    }
    compile(configPath) {
        return new Promise((resolve, reject) => {
            if (this.readOnly) {
                const errMsg = '[Truffle Compilation]: Cannot compile in read-only mode';
                return reject(new Error(errMsg));
            }
            const cmd = `truffle compile --config ${configPath}`;
            const options = { cwd: this.currentSharedFolder, shell: true };
            const child = spawn(cmd, options);
            let result = '';
            let error = '';
            child.stdout.on('data', (data) => {
                const msg = `[Truffle Compilation]: ${data.toString()}`;
                console.log('\x1b[32m%s\x1b[0m', msg);
                result += msg + '\n';
            });
            child.stderr.on('data', (err) => {
                error += `[Truffle Compilation]: ${err.toString()} \n`;
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
            const folderFiles = yield fs.readdir(this.buildPath);
            // name of folders are file names
            for (const file of folderFiles) {
                if (file.endsWith('.json')) {
                    const compilationResult = {
                        input: {},
                        output: {
                            contracts: {},
                            sources: {}
                        },
                        solcVersion: null,
                        compilationTarget: null
                    };
                    const content = yield fs.readFile((0, path_1.join)(this.buildPath, file), { encoding: 'utf-8' });
                    yield this.feedContractArtifactFile(file, content, compilationResult);
                    this.emit('compilationFinished', compilationResult.compilationTarget, { sources: compilationResult.input }, 'soljson', compilationResult.output, compilationResult.solcVersion);
                }
            }
            if (!this.warnLog) {
                // @ts-ignore
                this.call('terminal', 'log', { type: 'log', value: 'receiving compilation result from Truffle' });
                this.warnLog = true;
            }
        });
    }
    listenOnTruffleCompilation() {
        try {
            this.watcher = chokidar.watch(this.buildPath, { depth: 3, ignorePermissionErrors: true, ignoreInitial: true });
            this.watcher.on('change', (f) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () { return this.processArtifact(); }));
            this.watcher.on('add', (f) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () { return this.processArtifact(); }));
            // process the artifact on activation
            setTimeout(() => this.processArtifact(), 1000);
        }
        catch (e) {
            console.log(e);
        }
    }
    feedContractArtifactFile(path, content, compilationResultPart) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const contentJSON = JSON.parse(content);
            const contractName = (0, path_1.basename)(path).replace('.json', '');
            compilationResultPart.solcVersion = contentJSON.compiler.version;
            // file name in artifacts starts with `project:/`
            const filepath = contentJSON.ast.absolutePath.startsWith('project:/') ? contentJSON.ast.absolutePath.replace('project:/', '') : contentJSON.ast.absolutePath;
            compilationResultPart.compilationTarget = filepath;
            compilationResultPart.input[path] = { content: contentJSON.source };
            // extract data
            const relPath = utils.relativePath(filepath, this.currentSharedFolder);
            if (!compilationResultPart.output['sources'][relPath])
                compilationResultPart.output['sources'][relPath] = {};
            const location = contentJSON.ast.src.split(':');
            const id = parseInt(location[location.length - 1]);
            compilationResultPart.output['sources'][relPath] = {
                ast: contentJSON.ast,
                id
            };
            if (!compilationResultPart.output['contracts'][relPath])
                compilationResultPart.output['contracts'][relPath] = {};
            // delete contentJSON['ast']
            compilationResultPart.output['contracts'][relPath][contractName] = {
                abi: contentJSON.abi,
                evm: {
                    bytecode: {
                        object: contentJSON.bytecode.replace('0x', ''),
                        sourceMap: contentJSON.sourceMap,
                        linkReferences: contentJSON.linkReferences
                    },
                    deployedBytecode: {
                        object: contentJSON.deployedBytecode.replace('0x', ''),
                        sourceMap: contentJSON.deployedSourceMap,
                        linkReferences: contentJSON.deployedLinkReferences
                    }
                }
            };
        });
    }
    sync() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            console.log('syncing from Truffle');
            this.processArtifact();
            // @ts-ignore
            this.call('terminal', 'log', { type: 'log', value: 'synced with Truffle' });
        });
    }
}
exports.TruffleClient = TruffleClient;
//# sourceMappingURL=truffleClient.js.map