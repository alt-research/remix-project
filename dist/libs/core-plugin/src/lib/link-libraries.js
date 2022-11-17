"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkLibraries = exports.DeployLibraries = void 0;
const tslib_1 = require("tslib");
const remix_lib_1 = require("@remix-project/remix-lib");
const { txFormat } = remix_lib_1.execution;
const engine_1 = require("@remixproject/engine");
const profileDeployLibraries = {
    name: 'deploy-libraries',
    displayName: 'deploy-libraries',
    description: 'deploy-libraries',
    methods: ['isConcerned', 'execute']
};
const profileLinkLibraries = {
    name: 'link-libraries',
    displayName: 'link-libraries',
    description: 'link-libraries',
    methods: ['isConcerned', 'execute']
};
class DeployLibraries extends engine_1.Plugin {
    constructor(blockchain) {
        super(profileDeployLibraries);
        this.blockchain = blockchain;
    }
    isConcerned(contractData) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            return Object.keys(contractData.bytecodeLinkReferences).length > 0;
        });
    }
    execute(contractData, contractMetadata, compiledContracts) {
        // we deploy libraries
        // and return the linked bytecode
        return new Promise((resolve, reject) => {
            txFormat.linkBytecode(contractData.object, compiledContracts, (error, bytecode) => {
                if (error)
                    return reject(error);
                // final Callback
                resolve(bytecode);
            }, (message) => {
                // step Callback
                console.log(message);
            }, (data, runTxCallback) => {
                // deploy library Callback
                // called for libraries deployment
                this.blockchain.runTx(data, () => { }, () => { }, () => { }, runTxCallback);
            });
        });
    }
}
exports.DeployLibraries = DeployLibraries;
class LinkLibraries extends engine_1.Plugin {
    constructor(blockchain) {
        super(profileLinkLibraries);
        this.blockchain = blockchain;
    }
    isConcerned(contractData) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            return Object.keys(contractData.bytecodeLinkReferences).length > 0;
        });
    }
    execute(contractData, contractMetadata, compiledContracts) {
        // we just link libraries
        // and return the linked bytecode
        return new Promise((resolve, reject) => {
            txFormat.linkLibraries(contractData, contractMetadata.linkReferences, contractData.bytecodeLinkReferences, (error, bytecode) => {
                if (error)
                    return reject(error);
                resolve(bytecode);
            });
        });
    }
}
exports.LinkLibraries = LinkLibraries;
//# sourceMappingURL=link-libraries.js.map