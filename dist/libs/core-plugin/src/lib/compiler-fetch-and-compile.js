"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FetchAndCompile = void 0;
const tslib_1 = require("tslib");
const engine_1 = require("@remixproject/engine");
const remix_solidity_1 = require("@remix-project/remix-solidity");
const remix_lib_1 = require("@remix-project/remix-lib");
const ethereumjs_util_1 = require("ethereumjs-util");
const fetch_etherscan_1 = require("./helpers/fetch-etherscan");
const fetch_sourcify_1 = require("./helpers/fetch-sourcify");
const profile = {
    name: 'fetchAndCompile',
    methods: ['resolve', 'clearCache'],
    version: '0.0.1'
};
class FetchAndCompile extends engine_1.Plugin {
    constructor() {
        super(profile);
        this.unresolvedAddresses = [];
        this.sourceVerifierNetWork = ['Main', 'Rinkeby', 'Ropsten', 'Goerli'];
    }
    /**
     * Clear the cache
     *
     */
    clearCache() {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            this.unresolvedAddresses = [];
        });
    }
    /**
     * Fetch compiliation metadata from source-Verify from a given @arg contractAddress - https://github.com/ethereum/source-verify
     * Put the artifacts in the file explorer
     * Compile the code using Solidity compiler
     * Returns compilation data
     *
     * @param {string} contractAddress - Address of the contrac to resolve
     * @param {string} deployedBytecode - deployedBytecode of the contract
     * @param {string} targetPath - Folder where to save the compilation arfefacts
     * @return {CompilerAbstract} - compilation data targeting the given @arg contractAddress
     */
    resolve(contractAddress, codeAtAddress, targetPath) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            contractAddress = (0, ethereumjs_util_1.toChecksumAddress)(contractAddress);
            const localCompilation = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () { return (yield this.call('compilerArtefacts', 'get', contractAddress)) ? yield this.call('compilerArtefacts', 'get', contractAddress) : (yield this.call('compilerArtefacts', 'get', '__last')) ? yield this.call('compilerArtefacts', 'get', '__last') : null; });
            const resolved = yield this.call('compilerArtefacts', 'get', contractAddress);
            if (resolved)
                return resolved;
            if (this.unresolvedAddresses.includes(contractAddress))
                return localCompilation();
            // sometimes when doing an internal call, the only available artifact is the Solidity interface.
            // resolving addresses of internal call would allow to step over the source code, even if the declaration was made using an Interface.
            let network;
            try {
                network = yield this.call('network', 'detectNetwork');
            }
            catch (e) {
                return localCompilation();
            }
            if (!network)
                return localCompilation();
            if (!this.sourceVerifierNetWork.includes(network.name))
                return localCompilation();
            // check if the contract if part of the local compilation result
            const compilation = yield localCompilation();
            if (compilation) {
                let found = false;
                compilation.visitContracts((contract) => {
                    found = remix_lib_1.util.compareByteCode('0x' + contract.object.evm.deployedBytecode.object, codeAtAddress);
                    return found;
                });
                if (found) {
                    yield this.call('compilerArtefacts', 'addResolvedContract', contractAddress, compilation);
                    setTimeout(_ => this.emit('usingLocalCompilation', contractAddress), 0);
                    return compilation;
                }
            }
            targetPath = `${targetPath}/${network.id}/${contractAddress}`;
            let data;
            try {
                data = yield (0, fetch_sourcify_1.fetchContractFromSourcify)(this, network, contractAddress, targetPath);
            }
            catch (e) {
                this.call('notification', 'toast', e.message);
                console.log(e); // and fallback to getting the compilation result from etherscan
            }
            if (!data) {
                this.call('notification', 'toast', `contract ${contractAddress} not found in Sourcify, checking in Etherscan..`);
                try {
                    data = yield (0, fetch_etherscan_1.fetchContractFromEtherscan)(this, network, contractAddress, targetPath);
                }
                catch (e) {
                    this.call('notification', 'toast', e.message);
                    setTimeout(_ => this.emit('notFound', contractAddress), 0); // plugin framework returns a time out error although it actually didn't find the source...
                    this.unresolvedAddresses.push(contractAddress);
                    return localCompilation();
                }
            }
            if (!data) {
                setTimeout(_ => this.emit('notFound', contractAddress), 0);
                this.unresolvedAddresses.push(contractAddress);
                return localCompilation();
            }
            const { settings, compilationTargets } = data;
            try {
                setTimeout(_ => this.emit('compiling', settings), 0);
                const compData = yield (0, remix_solidity_1.compile)(compilationTargets, settings, (url, cb) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                    // we first try to resolve the content from the compilation target using a more appropiate path
                    const path = `${targetPath}/${url}`;
                    if (compilationTargets[path] && compilationTargets[path].content) {
                        return cb(null, compilationTargets[path].content);
                    }
                    else {
                        yield this.call('contentImport', 'resolveAndSave', url).then((result) => cb(null, result)).catch((error) => cb(error.message));
                    }
                }));
                yield this.call('compilerArtefacts', 'addResolvedContract', contractAddress, compData);
                return compData;
            }
            catch (e) {
                this.unresolvedAddresses.push(contractAddress);
                setTimeout(_ => this.emit('compilationFailed'), 0);
                return localCompilation();
            }
        });
    }
}
exports.FetchAndCompile = FetchAndCompile;
//# sourceMappingURL=compiler-fetch-and-compile.js.map