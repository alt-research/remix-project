'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxListener = void 0;
const tslib_1 = require("tslib");
const ethers_1 = require("ethers");
const ethereumjs_util_1 = require("ethereumjs-util");
const eventManager_1 = require("../eventManager");
const util_1 = require("../util");
const txFormat_1 = require("./txFormat");
const txHelper_1 = require("./txHelper");
function addExecutionCosts(txResult, tx, execResult) {
    if (txResult) {
        if (execResult) {
            tx.returnValue = execResult.returnValue;
            if (execResult.gasUsed)
                tx.executionCost = execResult.gasUsed.toString(10);
        }
        if (txResult.receipt && txResult.receipt.gasUsed)
            tx.transactionCost = txResult.receipt.gasUsed.toString(10);
    }
}
/**
  * poll web3 each 2s if web3
  * listen on transaction executed event if VM
  * attention: blocks returned by the event `newBlock` have slightly different json properties whether web3 or the VM is used
  * trigger 'newBlock'
  *
  */
class TxListener {
    constructor(opt, executionContext) {
        this.event = new eventManager_1.EventManager();
        // has a default for now for backwards compatability
        this.executionContext = executionContext;
        this._api = opt.api;
        this._resolvedTransactions = {};
        this._resolvedContracts = {};
        this._isListening = false;
        this._listenOnNetwork = false;
        this._loopId = null;
        this.init();
        this.executionContext.event.register('contextChanged', (context) => {
            if (this._isListening) {
                this.stopListening();
                this.startListening();
            }
        });
        opt.event.udapp.register('callExecuted', (error, from, to, data, lookupOnly, txResult) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (error)
                return;
            // we go for that case if
            // in VM mode
            // in web3 mode && listen remix txs only
            if (!this._isListening)
                return; // we don't listen
            if (this._loopId)
                return; // we seems to already listen on a "web3" network
            let returnValue;
            let execResult;
            if (this.executionContext.isVM()) {
                execResult = yield this.executionContext.web3().eth.getExecutionResultFromSimulator(txResult.transactionHash);
                returnValue = execResult.returnValue;
            }
            else {
                returnValue = (0, ethereumjs_util_1.toBuffer)((0, ethereumjs_util_1.addHexPrefix)(txResult.result));
            }
            const call = {
                from: from,
                to: to,
                input: data,
                hash: txResult.transactionHash ? txResult.transactionHash : 'call' + (from || '') + to + data,
                isCall: true,
                returnValue,
                envMode: this.executionContext.getProvider()
            };
            addExecutionCosts(txResult, call, execResult);
            this._resolveTx(call, call, (error, resolvedData) => {
                if (!error) {
                    this.event.trigger('newCall', [call]);
                }
            });
        }));
        opt.event.udapp.register('transactionExecuted', (error, from, to, data, lookupOnly, txResult) => {
            if (error)
                return;
            if (lookupOnly)
                return;
            // we go for that case if
            // in VM mode
            // in web3 mode && listen remix txs only
            if (!this._isListening)
                return; // we don't listen
            if (this._loopId)
                return; // we seems to already listen on a "web3" network
            this.executionContext.web3().eth.getTransaction(txResult.transactionHash, (error, tx) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                if (error)
                    return console.log(error);
                let execResult;
                if (this.executionContext.isVM()) {
                    execResult = yield this.executionContext.web3().eth.getExecutionResultFromSimulator(txResult.transactionHash);
                }
                addExecutionCosts(txResult, tx, execResult);
                tx.envMode = this.executionContext.getProvider();
                tx.status = txResult.receipt.status; // 0x0 or 0x1
                this._resolve([tx]);
            }));
        });
    }
    /**
      * define if txlistener should listen on the network or if only tx created from remix are managed
      *
      * @param {Bool} type - true if listen on the network
      */
    setListenOnNetwork(listenOnNetwork) {
        this._listenOnNetwork = listenOnNetwork;
        if (this._loopId) {
            clearInterval(this._loopId);
        }
        this._listenOnNetwork ? this.startListening() : this.stopListening();
    }
    /**
      * reset recorded transactions
      */
    init() {
        this.blocks = [];
    }
    /**
      * start listening for incoming transactions
      *
      * @param {String} type - type/name of the provider to add
      * @param {Object} obj  - provider
      */
    startListening() {
        this.init();
        this._isListening = true;
        if (this._listenOnNetwork && this.executionContext.getProvider() !== 'vm') {
            this._startListenOnNetwork();
        }
    }
    /**
      * stop listening for incoming transactions. do not reset the recorded pool.
      *
      * @param {String} type - type/name of the provider to add
      * @param {Object} obj  - provider
      */
    stopListening() {
        if (this._loopId) {
            clearInterval(this._loopId);
        }
        this._loopId = null;
        this._isListening = false;
    }
    _startListenOnNetwork() {
        var _a;
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            let lastSeenBlock = ((_a = this.executionContext.lastBlock) === null || _a === void 0 ? void 0 : _a.number) - 1;
            let processingBlock = false;
            const processBlocks = () => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
                var _b, _c;
                if (!this._isListening)
                    return;
                if (processingBlock)
                    return;
                processingBlock = true;
                const currentLoopId = this._loopId;
                if (this._loopId === null) {
                    processingBlock = false;
                    return;
                }
                if (!lastSeenBlock) {
                    lastSeenBlock = (_b = this.executionContext.lastBlock) === null || _b === void 0 ? void 0 : _b.number; // trying to resynchronize
                    console.log('listen on blocks, resynchronising');
                    processingBlock = false;
                    return;
                }
                const current = (_c = this.executionContext.lastBlock) === null || _c === void 0 ? void 0 : _c.number;
                if (!current) {
                    console.log(new Error('no last block found'));
                    processingBlock = false;
                    return;
                }
                if (currentLoopId === this._loopId && lastSeenBlock < current) {
                    while (lastSeenBlock <= current) {
                        try {
                            if (!this._isListening)
                                break;
                            yield this._manageBlock(lastSeenBlock);
                        }
                        catch (e) {
                            console.log(e);
                        }
                        lastSeenBlock++;
                    }
                    lastSeenBlock = current;
                }
                processingBlock = false;
            });
            this._loopId = setInterval(processBlocks, 20000);
            processBlocks();
        });
    }
    _manageBlock(blockNumber) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            try {
                const result = yield this.executionContext.web3().eth.getBlock(blockNumber, true);
                return yield this._newBlock(Object.assign({ type: 'web3' }, result));
            }
            catch (e) { }
        });
    }
    /**
      * try to resolve the contract name from the given @arg address
      *
      * @param {String} address - contract address to resolve
      * @return {String} - contract name
      */
    resolvedContract(address) {
        if (this._resolvedContracts[address])
            return this._resolvedContracts[address].name;
        return null;
    }
    /**
      * try to resolve the transaction from the given @arg txHash
      *
      * @param {String} txHash - contract address to resolve
      * @return {String} - contract name
      */
    resolvedTransaction(txHash) {
        return this._resolvedTransactions[txHash];
    }
    _newBlock(block) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            this.blocks.push(block);
            yield this._resolve(block.transactions);
            this.event.trigger('newBlock', [block]);
        });
    }
    _resolveAsync(tx) {
        return new Promise((resolve, reject) => {
            this._api.resolveReceipt(tx, (error, receipt) => {
                if (error)
                    return reject(error);
                this._resolveTx(tx, receipt, (error, resolvedData) => {
                    if (error)
                        return reject(error);
                    if (resolvedData) {
                        this.event.trigger('txResolved', [tx, receipt, resolvedData]);
                    }
                    this.event.trigger('newTransaction', [tx, receipt]);
                    resolve({});
                });
            });
        });
    }
    _resolve(transactions) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            for (const tx of transactions) {
                try {
                    if (!this._isListening)
                        break;
                    yield this._resolveAsync(tx);
                }
                catch (e) { }
            }
        });
    }
    _resolveTx(tx, receipt, cb) {
        const contracts = this._api.contracts();
        if (!contracts)
            return cb();
        let fun;
        let contract;
        if (!tx.to || tx.to === '0x0') { // testrpc returns 0x0 in that case
            // contract creation / resolve using the creation bytes code
            // if web3: we have to call getTransactionReceipt to get the created address
            // if VM: created address already included
            const code = tx.input;
            contract = this._tryResolveContract(code, contracts, true);
            if (contract) {
                const address = receipt.contractAddress;
                this._resolvedContracts[address] = contract;
                fun = this._resolveFunction(contract, tx, true);
                if (this._resolvedTransactions[tx.hash]) {
                    this._resolvedTransactions[tx.hash].contractAddress = address;
                }
                return cb(null, { to: null, contractName: contract.name, function: fun, creationAddress: address });
            }
            return cb();
        }
        else {
            // first check known contract, resolve against the `runtimeBytecode` if not known
            contract = this._resolvedContracts[tx.to];
            if (!contract) {
                this.executionContext.web3().eth.getCode(tx.to, (error, code) => {
                    if (error)
                        return cb(error);
                    if (code) {
                        const contract = this._tryResolveContract(code, contracts, false);
                        if (contract) {
                            this._resolvedContracts[tx.to] = contract;
                            const fun = this._resolveFunction(contract, tx, false);
                            return cb(null, { to: tx.to, contractName: contract.name, function: fun });
                        }
                    }
                    return cb();
                });
                return;
            }
            if (contract) {
                fun = this._resolveFunction(contract, tx, false);
                return cb(null, { to: tx.to, contractName: contract.name, function: fun });
            }
            return cb();
        }
    }
    _resolveFunction(contract, tx, isCtor) {
        if (!contract) {
            console.log('txListener: cannot resolve contract - contract is null');
            return;
        }
        const abi = contract.object.abi;
        const inputData = tx.input.replace('0x', '');
        if (!isCtor) {
            const methodIdentifiers = contract.object.evm.methodIdentifiers;
            for (const fn in methodIdentifiers) {
                if (methodIdentifiers[fn] === inputData.substring(0, 8)) {
                    const fnabi = (0, txHelper_1.getFunction)(abi, fn);
                    this._resolvedTransactions[tx.hash] = {
                        contractName: contract.name,
                        to: tx.to,
                        fn: fn,
                        params: this._decodeInputParams(inputData.substring(8), fnabi)
                    };
                    if (tx.returnValue) {
                        this._resolvedTransactions[tx.hash].decodedReturnValue = (0, txFormat_1.decodeResponse)(tx.returnValue, fnabi);
                    }
                    return this._resolvedTransactions[tx.hash];
                }
            }
            // receive function
            if (!inputData && (0, txHelper_1.getReceiveInterface)(abi)) {
                this._resolvedTransactions[tx.hash] = {
                    contractName: contract.name,
                    to: tx.to,
                    fn: '(receive)',
                    params: null
                };
            }
            else {
                // fallback function
                this._resolvedTransactions[tx.hash] = {
                    contractName: contract.name,
                    to: tx.to,
                    fn: '(fallback)',
                    params: null
                };
            }
        }
        else {
            const bytecode = contract.object.evm.bytecode.object;
            let params = null;
            if (bytecode && bytecode.length) {
                params = this._decodeInputParams((0, util_1.getinputParameters)(inputData), (0, txHelper_1.getConstructorInterface)(abi));
            }
            this._resolvedTransactions[tx.hash] = {
                contractName: contract.name,
                to: null,
                fn: '(constructor)',
                params: params
            };
        }
        return this._resolvedTransactions[tx.hash];
    }
    _tryResolveContract(codeToResolve, compiledContracts, isCreation) {
        let found = null;
        (0, txHelper_1.visitContracts)(compiledContracts, (contract) => {
            const bytes = isCreation ? contract.object.evm.bytecode.object : contract.object.evm.deployedBytecode.object;
            if ((0, util_1.compareByteCode)(codeToResolve, '0x' + bytes)) {
                found = contract;
                return true;
            }
        });
        return found;
    }
    _decodeInputParams(data, abi) {
        data = (0, ethereumjs_util_1.toBuffer)((0, ethereumjs_util_1.addHexPrefix)(data));
        if (!data.length)
            data = new Uint8Array(32 * abi.inputs.length); // ensuring the data is at least filled by 0 cause `AbiCoder` throws if there's not engouh data
        const inputTypes = [];
        for (let i = 0; i < abi.inputs.length; i++) {
            const type = abi.inputs[i].type;
            inputTypes.push(type.indexOf('tuple') === 0 ? (0, txHelper_1.makeFullTypeDefinition)(abi.inputs[i]) : type);
        }
        const abiCoder = new ethers_1.ethers.utils.AbiCoder();
        const decoded = abiCoder.decode(inputTypes, data);
        const ret = {};
        for (const k in abi.inputs) {
            ret[abi.inputs[k].type + ' ' + abi.inputs[k].name] = decoded[k];
        }
        return ret;
    }
}
exports.TxListener = TxListener;
//# sourceMappingURL=txListener.js.map