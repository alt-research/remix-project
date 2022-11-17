"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenZeppelinProxy = void 0;
const tslib_1 = require("tslib");
const engine_1 = require("@remixproject/engine");
const uups_1 = require("./constants/uups");
const proxyProfile = {
    name: 'openzeppelin-proxy',
    displayName: 'openzeppelin-proxy',
    description: 'openzeppelin-proxy',
    methods: ['isConcerned', 'executeUUPSProxy', 'executeUUPSContractUpgrade', 'getProxyOptions', 'getUpgradeOptions']
};
class OpenZeppelinProxy extends engine_1.Plugin {
    constructor(blockchain) {
        super(proxyProfile);
        this.blockchain = blockchain;
    }
    isConcerned(ast = {}) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            // check in the AST if it's an upgradable contract
            const UUPSSymbol = ast.exportedSymbols && ast.exportedSymbols[uups_1.UUPS] ? ast.exportedSymbols[uups_1.UUPS][0] : null;
            if (UUPSSymbol) {
                this.kind = 'UUPS';
                return true;
            }
            //
            // else if transparent contract run check true/false
            //
            return false;
        });
    }
    getProxyOptions(data, file) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const contracts = data.contracts[file];
            const ast = data.sources[file].ast;
            if (this.kind === 'UUPS') {
                const options = yield (this.getUUPSContractOptions(contracts, ast, file));
                return options;
            }
        });
    }
    getUUPSContractOptions(contracts, ast, file) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const options = {};
            yield Promise.all(Object.keys(contracts).map((name) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                if (ast) {
                    const UUPSSymbol = ast.exportedSymbols[uups_1.UUPS] ? ast.exportedSymbols[uups_1.UUPS][0] : null;
                    yield Promise.all(ast.absolutePath === file && ast.nodes.map((node) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                        if (node.name === name && node.linearizedBaseContracts.includes(UUPSSymbol)) {
                            const abi = contracts[name].abi;
                            const initializeInput = abi.find(node => node.name === 'initialize');
                            const isDeployWithProxyEnabled = (yield this.call('config', 'getAppParameter', uups_1.EnableProxyURLParam)) || false;
                            const isDeployWithUpgradeEnabled = (yield this.call('config', 'getAppParameter', uups_1.EnableUpgradeURLParam)) || false;
                            options[name] = {
                                options: [{ title: 'Deploy with Proxy', active: isDeployWithProxyEnabled }, { title: 'Upgrade with Proxy', active: isDeployWithUpgradeEnabled }],
                                initializeOptions: {
                                    inputs: initializeInput,
                                    initializeInputs: initializeInput ? this.blockchain.getInputs(initializeInput) : null
                                }
                            };
                        }
                    })));
                }
            })));
            return options;
        });
    }
    executeUUPSProxy(implAddress, args = '', initializeABI, implementationContractObject) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            // deploy the proxy, or use an existing one
            if (!initializeABI)
                throw new Error('Cannot deploy proxy: Missing initialize ABI');
            args = args === '' ? [] : args;
            const _data = yield this.blockchain.getEncodedFunctionHex(args || [], initializeABI);
            if (this.kind === 'UUPS')
                this.deployUUPSProxy(implAddress, _data, implementationContractObject);
        });
    }
    executeUUPSContractUpgrade(proxyAddress, newImplAddress, newImplementationContractObject) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!newImplAddress)
                throw new Error('Cannot upgrade: Missing implementation address');
            if (!proxyAddress)
                throw new Error('Cannot upgrade: Missing proxy address');
            if (this.kind === 'UUPS')
                this.upgradeUUPSProxy(proxyAddress, newImplAddress, newImplementationContractObject);
        });
    }
    deployUUPSProxy(implAddress, _data, implementationContractObject) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const args = [implAddress, _data];
            const constructorData = yield this.blockchain.getEncodedParams(args, uups_1.UUPSfunAbi);
            const proxyName = 'ERC1967Proxy';
            const data = {
                contractABI: uups_1.UUPSABI,
                contractByteCode: uups_1.UUPSBytecode,
                contractName: proxyName,
                funAbi: uups_1.UUPSfunAbi,
                funArgs: args,
                linkReferences: {},
                dataHex: uups_1.UUPSBytecode + constructorData.replace('0x', '')
            };
            // re-use implementation contract's ABI for UI display in udapp and change name to proxy name.
            implementationContractObject.name = proxyName;
            this.blockchain.deployProxy(data, implementationContractObject);
        });
    }
    upgradeUUPSProxy(proxyAddress, newImplAddress, newImplementationContractObject) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const fnData = yield this.blockchain.getEncodedFunctionHex([newImplAddress], uups_1.UUPSupgradeAbi);
            const proxyName = 'ERC1967Proxy';
            const data = {
                contractABI: uups_1.UUPSABI,
                contractName: proxyName,
                funAbi: uups_1.UUPSupgradeAbi,
                funArgs: [newImplAddress],
                linkReferences: {},
                dataHex: fnData.replace('0x', '')
            };
            // re-use implementation contract's ABI for UI display in udapp and change name to proxy name.
            newImplementationContractObject.name = proxyName;
            this.blockchain.upgradeProxy(proxyAddress, newImplAddress, data, newImplementationContractObject);
        });
    }
}
exports.OpenZeppelinProxy = OpenZeppelinProxy;
//# sourceMappingURL=openzeppelin-proxy.js.map