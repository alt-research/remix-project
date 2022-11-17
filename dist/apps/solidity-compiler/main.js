(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{

/***/ "../../../dist/libs/remix-lib/src/eventManager.js":
/*!***************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/eventManager.js ***!
  \***************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventManager = void 0;
class EventManager {
  constructor() {
    this.registered = {};
    this.anonymous = {};
  }
  /*
    * Unregister a listener.
    * Note that if obj is a function. the unregistration will be applied to the dummy obj {}.
    *
    * @param {String} eventName  - the event name
    * @param {Object or Func} obj - object that will listen on this event
    * @param {Func} func         - function of the listeners that will be executed
  */
  unregister(eventName, obj, func) {
    if (!this.registered[eventName]) {
      return;
    }
    if (obj instanceof Function) {
      func = obj;
      obj = this.anonymous;
    }
    for (const reg in this.registered[eventName]) {
      if (this.registered[eventName][reg].obj === obj && this.registered[eventName][reg].func.toString() === func.toString()) {
        this.registered[eventName].splice(reg, 1);
      }
    }
  }
  /*
    * Register a new listener.
    * Note that if obj is a function, the function registration will be associated with the dummy object {}
    *
    * @param {String} eventName  - the event name
    * @param {Object or Func} obj - object that will listen on this event
    * @param {Func} func         - function of the listeners that will be executed
  */
  register(eventName, obj, func) {
    if (!this.registered[eventName]) {
      this.registered[eventName] = [];
    }
    if (obj instanceof Function) {
      func = obj;
      obj = this.anonymous;
    }
    this.registered[eventName].push({
      obj,
      func
    });
  }
  /*
    * trigger event.
    * Every listener have their associated function executed
    *
    * @param {String} eventName  - the event name
    * @param {Array}j - argument that will be passed to the executed function.
  */
  trigger(eventName, args) {
    if (!this.registered[eventName]) {
      return;
    }
    for (const listener in this.registered[eventName]) {
      const l = this.registered[eventName][listener];
      if (l.func) l.func.apply(l.obj === this.anonymous ? {} : l.obj, args);
    }
  }
}
exports.EventManager = EventManager;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/eventsDecoder.js":
/*!**************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/eventsDecoder.js ***!
  \**************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EventsDecoder = void 0;
const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");
const txHelper_1 = __webpack_require__(/*! ./txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js");
/**
  * Register to txListener and extract events
  *
  */
class EventsDecoder {
  constructor({
    resolveReceipt
  }) {
    this.resolveReceipt = resolveReceipt;
  }
  /**
  * use Transaction Receipt to decode logs. assume that the transaction as already been resolved by txListener.
  * logs are decoded only if the contract if known by remix.
  *
  * @param {Object} tx - transaction object
  * @param {Function} cb - callback
  */
  parseLogs(tx, contractName, compiledContracts, cb) {
    if (tx.isCall) return cb(null, {
      decoded: [],
      raw: []
    });
    this.resolveReceipt(tx, (error, receipt) => {
      if (error) return cb(error);
      this._decodeLogs(tx, receipt, contractName, compiledContracts, cb);
    });
  }
  _decodeLogs(tx, receipt, contract, contracts, cb) {
    if (!contract || !receipt) {
      return cb('cannot decode logs - contract or receipt not resolved ');
    }
    if (!receipt.logs) {
      return cb(null, {
        decoded: [],
        raw: []
      });
    }
    this._decodeEvents(tx, receipt.logs, contract, contracts, cb);
  }
  _eventABI(contract) {
    const eventABI = {};
    const abi = new ethers_1.ethers.utils.Interface(contract.abi);
    for (const e in abi.events) {
      const event = abi.getEvent(e);
      eventABI[abi.getEventTopic(e).replace('0x', '')] = {
        event: event.name,
        inputs: event.inputs,
        object: event,
        abi: abi
      };
    }
    return eventABI;
  }
  _eventsABI(compiledContracts) {
    const eventsABI = {};
    (0, txHelper_1.visitContracts)(compiledContracts, contract => {
      eventsABI[contract.name] = this._eventABI(contract.object);
    });
    return eventsABI;
  }
  _event(hash, eventsABI) {
    // get all the events responding to that hash.
    const contracts = [];
    for (const k in eventsABI) {
      if (eventsABI[k][hash]) {
        const event = eventsABI[k][hash];
        for (const input of event.inputs) {
          if (input.type === 'function') {
            input.type = 'bytes24';
            input.baseType = 'bytes24';
          }
        }
        contracts.push(event);
      }
    }
    return contracts;
  }
  _stringifyBigNumber(value) {
    return value._isBigNumber ? value.toString() : value;
  }
  _stringifyEvent(value) {
    if (value === null || value === undefined) return ' - ';
    if (value._ethersType) value.type = value._ethersType;
    if (Array.isArray(value)) {
      // for struct && array
      return value.map(item => {
        return this._stringifyEvent(item);
      });
    } else {
      return this._stringifyBigNumber(value);
    }
  }
  _decodeEvents(tx, logs, contractName, compiledContracts, cb) {
    const eventsABI = this._eventsABI(compiledContracts);
    const events = [];
    for (const i in logs) {
      // [address, topics, mem]
      const log = logs[i];
      const topicId = log.topics[0];
      const eventAbis = this._event(topicId.replace('0x', ''), eventsABI);
      for (const eventAbi of eventAbis) {
        try {
          if (eventAbi) {
            const decodedlog = eventAbi.abi.parseLog(log);
            const decoded = {};
            for (const v in decodedlog.args) {
              decoded[v] = this._stringifyEvent(decodedlog.args[v]);
            }
            events.push({
              from: log.address,
              topic: topicId,
              event: eventAbi.event,
              args: decoded
            });
          } else {
            events.push({
              from: log.address,
              data: log.data,
              topics: log.topics
            });
          }
          break; // if one of the iteration is successful
        } catch (e) {
          continue;
        }
      }
    }
    cb(null, {
      decoded: events,
      raw: logs
    });
  }
}
exports.EventsDecoder = EventsDecoder;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/forkAt.js":
/*!*******************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/forkAt.js ***!
  \*******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.forkAt = void 0;
/**
  * returns the fork name for the @argument networkId and @argument blockNumber
  *
  * @param {Object} networkId - network Id (1 for VM, 3 for Ropsten, 4 for Rinkeby, 5 for Goerli)
  * @param {Object} blockNumber - block number
  * @return {String} - fork name (Berlin, Istanbul, ...)
  */
function forkAt(networkId, blockNumber) {
  if (forks[networkId]) {
    let currentForkName = forks[networkId][0].name;
    for (const fork of forks[networkId]) {
      if (blockNumber >= fork.number) {
        currentForkName = fork.name;
      }
    }
    return currentForkName;
  }
  return 'london';
}
exports.forkAt = forkAt;
// see https://github.com/ethereum/go-ethereum/blob/master/params/config.go
const forks = {
  1: [{
    number: 4370000,
    name: 'byzantium'
  }, {
    number: 7280000,
    name: 'constantinople'
  }, {
    number: 7280000,
    name: 'petersburg'
  }, {
    number: 9069000,
    name: 'istanbul'
  }, {
    number: 9200000,
    name: 'muirglacier'
  }, {
    number: 12244000,
    name: 'berlin'
  }, {
    number: 12965000,
    name: 'london'
  }, {
    number: 13773000,
    name: 'arrowGlacier'
  }, {
    number: 15050000,
    name: 'grayGlacier'
  }],
  3: [{
    number: 1700000,
    name: 'byzantium'
  }, {
    number: 4230000,
    name: 'constantinople'
  }, {
    number: 4939394,
    name: 'petersburg'
  }, {
    number: 6485846,
    name: 'istanbul'
  }, {
    number: 7117117,
    name: 'muirglacier'
  }, {
    number: 9812189,
    name: 'berlin'
  }, {
    number: 10499401,
    name: 'london'
  }],
  4: [{
    number: 1035301,
    name: 'byzantium'
  }, {
    number: 3660663,
    name: 'constantinople'
  }, {
    number: 4321234,
    name: 'petersburg'
  }, {
    number: 5435345,
    name: 'istanbul'
  }, {
    number: 8290928,
    name: 'berlin'
  }, {
    number: 8897988,
    name: 'london'
  }],
  5: [{
    number: 1561651,
    name: 'istanbul'
  }, {
    number: 4460644,
    name: 'berlin'
  }, {
    number: 5062605,
    name: 'london'
  }]
};

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/logsManager.js":
/*!************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/logsManager.js ***!
  \************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.LogsManager = void 0;
const async_1 = __webpack_require__(/*! async */ "../../../node_modules/async/dist/async.js");
const crypto_1 = __webpack_require__(/*! crypto */ "../../../node_modules/crypto-browserify/index.js");
class LogsManager {
  constructor() {
    this.notificationCallbacks = [];
    this.subscriptions = {};
    this.filters = {};
    this.filterTracking = {};
    this.oldLogs = [];
  }
  checkBlock(blockNumber, block, web3) {
    (0, async_1.eachOf)(block.transactions, (tx, i, next) => {
      const txHash = '0x' + tx.hash().toString('hex');
      web3.eth.getTransactionReceipt(txHash, (_error, receipt) => {
        for (const log of receipt.logs) {
          this.oldLogs.push({
            type: 'block',
            blockNumber,
            block,
            tx,
            log,
            txNumber: i
          });
          const subscriptions = this.getSubscriptionsFor({
            type: 'block',
            blockNumber,
            block,
            tx,
            log
          });
          for (const subscriptionId of subscriptions) {
            const result = {
              logIndex: '0x1',
              blockNumber: blockNumber,
              blockHash: '0x' + block.hash().toString('hex'),
              transactionHash: '0x' + tx.hash().toString('hex'),
              transactionIndex: '0x' + i.toString(16),
              // TODO: if it's a contract deploy, it should be that address instead
              address: log.address,
              data: log.data,
              topics: log.topics
            };
            if (result.address === '0x') {
              delete result.address;
            }
            const response = {
              jsonrpc: '2.0',
              method: 'eth_subscription',
              params: {
                result: result,
                subscription: subscriptionId
              }
            };
            this.transmit(response);
          }
        }
      });
    }, _err => {});
  }
  eventMatchesFilter(changeEvent, queryType, queryFilter) {
    if (queryFilter.topics.filter(logTopic => changeEvent.log.topics.indexOf(logTopic) >= 0).length === 0) return false;
    if (queryType === 'logs') {
      const fromBlock = queryFilter.fromBlock || '0x0';
      const toBlock = queryFilter.toBlock || this.oldLogs.length ? this.oldLogs[this.oldLogs.length - 1].blockNumber : '0x0';
      if (queryFilter.address === (changeEvent.tx.to || '').toString() || queryFilter.address === changeEvent.tx.getSenderAddress().toString()) {
        if (parseInt(toBlock) >= parseInt(changeEvent.blockNumber) && parseInt(fromBlock) <= parseInt(changeEvent.blockNumber)) {
          return true;
        }
      }
    }
    return false;
  }
  getSubscriptionsFor(changeEvent) {
    const matchedSubscriptions = [];
    for (const subscriptionId of Object.keys(this.subscriptions)) {
      const subscriptionParams = this.subscriptions[subscriptionId];
      const [queryType, queryFilter] = subscriptionParams;
      if (this.eventMatchesFilter(changeEvent, queryType, queryFilter || {
        topics: []
      })) {
        matchedSubscriptions.push(subscriptionId);
      }
    }
    return matchedSubscriptions;
  }
  getLogsForSubscription(subscriptionId) {
    const subscriptionParams = this.subscriptions[subscriptionId];
    const [_queryType, queryFilter] = subscriptionParams; // eslint-disable-line
    return this.getLogsFor(queryFilter);
  }
  transmit(result) {
    this.notificationCallbacks.forEach(callback => {
      if (result.params.result.raw) {
        result.params.result.data = result.params.result.raw.data;
        result.params.result.topics = result.params.result.raw.topics;
      }
      callback(result);
    });
  }
  addListener(_type, cb) {
    this.notificationCallbacks.push(cb);
  }
  subscribe(params) {
    const subscriptionId = '0x' + (0, crypto_1.randomBytes)(16).toString('hex');
    this.subscriptions[subscriptionId] = params;
    return subscriptionId;
  }
  unsubscribe(subscriptionId) {
    delete this.subscriptions[subscriptionId];
  }
  newFilter(filterType, params) {
    const filterId = '0x' + (0, crypto_1.randomBytes)(16).toString('hex');
    if (filterType === 'block' || filterType === 'pendingTransactions') {
      this.filters[filterId] = {
        filterType
      };
    }
    if (filterType === 'filter') {
      this.filters[filterId] = {
        filterType,
        params
      };
    }
    this.filterTracking[filterId] = {};
    return filterId;
  }
  uninstallFilter(filterId) {
    delete this.filters[filterId];
  }
  getLogsForFilter(filterId, logsOnly) {
    const {
      filterType,
      params
    } = this.filters[filterId];
    const tracking = this.filterTracking[filterId];
    if (logsOnly || filterType === 'filter') {
      return this.getLogsFor(params || {
        topics: []
      });
    }
    if (filterType === 'block') {
      const blocks = this.oldLogs.filter(x => x.type === 'block').filter(x => tracking.block === undefined || x.blockNumber >= tracking.block);
      tracking.block = blocks[blocks.length - 1];
      return blocks.map(block => '0x' + block.hash().toString('hex'));
    }
    if (filterType === 'pendingTransactions') {
      return [];
    }
  }
  getLogsByTxHash(hash) {
    return this.oldLogs.filter(log => '0x' + log.tx.hash().toString('hex') === hash).map(log => {
      return {
        logIndex: '0x1',
        blockNumber: log.blockNumber,
        blockHash: '0x' + log.block.hash().toString('hex'),
        transactionHash: '0x' + log.tx.hash().toString('hex'),
        transactionIndex: '0x' + log.txNumber.toString(16),
        // TODO: if it's a contract deploy, it should be that address instead
        address: log.log.address,
        data: log.log.data,
        topics: log.log.topics
      };
    });
  }
  getLogsFor(params) {
    const results = [];
    for (const log of this.oldLogs) {
      if (this.eventMatchesFilter(log, 'logs', params)) {
        results.push({
          logIndex: '0x1',
          blockNumber: log.blockNumber,
          blockHash: '0x' + log.block.hash().toString('hex'),
          transactionHash: '0x' + log.tx.hash().toString('hex'),
          transactionIndex: '0x' + log.txNumber.toString(16),
          // TODO: if it's a contract deploy, it should be that address instead
          address: log.log.address,
          data: log.log.data,
          topics: log.log.topics
        });
      }
    }
    return results;
  }
}
exports.LogsManager = LogsManager;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txExecution.js":
/*!************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/txExecution.js ***!
  \************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkVMError = exports.callFunction = exports.createContract = void 0;
const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");
const txHelper_1 = __webpack_require__(/*! ./txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js");
/**
  * deploy the given contract
  *
  * @param {String} from    - sender address
  * @param {String} data    - data to send with the transaction ( return of txFormat.buildData(...) ).
  * @param {String} value    - decimal representation of value.
  * @param {String} gasLimit    - decimal representation of gas limit.
  * @param {Object} txRunner    - TxRunner.js instance
  * @param {Object} callbacks    - { confirmationCb, gasEstimationForceSend, promptCb }
  *     [validate transaction] confirmationCb (network, tx, gasEstimation, continueTxExecution, cancelCb)
  *     [transaction failed, force send] gasEstimationForceSend (error, continueTxExecution, cancelCb)
  *     [personal mode enabled, need password to continue] promptCb (okCb, cancelCb)
  * @param {Function} finalCallback    - last callback.
  */
function createContract(from, data, value, gasLimit, txRunner, callbacks, finalCallback) {
  if (!callbacks.confirmationCb || !callbacks.gasEstimationForceSend || !callbacks.promptCb) {
    return finalCallback('all the callbacks must have been defined');
  }
  const tx = {
    from: from,
    to: null,
    data: data,
    useCall: false,
    value: value,
    gasLimit: gasLimit
  };
  txRunner.rawRun(tx, callbacks.confirmationCb, callbacks.gasEstimationForceSend, callbacks.promptCb, (error, txResult) => {
    // see universaldapp.js line 660 => 700 to check possible values of txResult (error case)
    finalCallback(error, txResult);
  });
}
exports.createContract = createContract;
/**
  * call the current given contract ! that will create a transaction !
  *
  * @param {String} from    - sender address
  * @param {String} to    - recipient address
  * @param {String} data    - data to send with the transaction ( return of txFormat.buildData(...) ).
  * @param {String} value    - decimal representation of value.
  * @param {String} gasLimit    - decimal representation of gas limit.
  * @param {Object} txRunner    - TxRunner.js instance
  * @param {Object} callbacks    - { confirmationCb, gasEstimationForceSend, promptCb }
  *     [validate transaction] confirmationCb (network, tx, gasEstimation, continueTxExecution, cancelCb)
  *     [transaction failed, force send] gasEstimationForceSend (error, continueTxExecution, cancelCb)
  *     [personal mode enabled, need password to continue] promptCb (okCb, cancelCb)
  * @param {Function} finalCallback    - last callback.
  */
function callFunction(from, to, data, value, gasLimit, funAbi, txRunner, callbacks, finalCallback) {
  const useCall = funAbi.stateMutability === 'view' || funAbi.stateMutability === 'pure' || funAbi.constant;
  const tx = {
    from,
    to,
    data,
    useCall,
    value,
    gasLimit
  };
  txRunner.rawRun(tx, callbacks.confirmationCb, callbacks.gasEstimationForceSend, callbacks.promptCb, (error, txResult) => {
    // see universaldapp.js line 660 => 700 to check possible values of txResult (error case)
    finalCallback(error, txResult);
  });
}
exports.callFunction = callFunction;
/**
  * check if the vm has errored
  *
  * @param {Object} execResult    - execution result given by the VM
  * @return {Object} -  { error: true/false, message: DOMNode }
  */
function checkVMError(execResult, compiledContracts) {
  const errorCode = {
    OUT_OF_GAS: 'out of gas',
    STACK_UNDERFLOW: 'stack underflow',
    STACK_OVERFLOW: 'stack overflow',
    INVALID_JUMP: 'invalid JUMP',
    INVALID_OPCODE: 'invalid opcode',
    REVERT: 'revert',
    STATIC_STATE_CHANGE: 'static state change',
    INTERNAL_ERROR: 'internal error',
    CREATE_COLLISION: 'create collision',
    STOP: 'stop',
    REFUND_EXHAUSTED: 'refund exhausted'
  };
  const ret = {
    error: false,
    message: ''
  };
  if (!execResult.exceptionError) {
    return ret;
  }
  const exceptionError = execResult.exceptionError.error || '';
  const error = `VM error: ${exceptionError}.\n`;
  let msg;
  if (exceptionError === errorCode.INVALID_OPCODE) {
    msg = '\t\n\tThe execution might have thrown.\n';
    ret.error = true;
  } else if (exceptionError === errorCode.OUT_OF_GAS) {
    msg = '\tThe transaction ran out of gas. Please increase the Gas Limit.\n';
    ret.error = true;
  } else if (exceptionError === errorCode.REVERT) {
    const returnData = execResult.returnValue;
    const returnDataHex = returnData.slice(0, 4).toString('hex');
    let customError;
    if (compiledContracts) {
      let decodedCustomErrorInputsClean;
      for (const file of Object.keys(compiledContracts)) {
        for (const contractName of Object.keys(compiledContracts[file])) {
          const contract = compiledContracts[file][contractName];
          for (const item of contract.abi) {
            if (item.type === 'error') {
              // ethers doesn't crash anymore if "error" type is specified, but it doesn't extract the errors. see:
              // https://github.com/ethers-io/ethers.js/commit/bd05aed070ac9e1421a3e2bff2ceea150bedf9b7
              // we need here to fake the type, so the "getSighash" function works properly
              const fn = (0, txHelper_1.getFunctionFragment)(Object.assign(Object.assign({}, item), {
                type: 'function',
                stateMutability: 'nonpayable'
              }));
              if (!fn) continue;
              const sign = fn.getSighash(item.name);
              if (!sign) continue;
              if (returnDataHex === sign.replace('0x', '')) {
                customError = item.name;
                const functionDesc = fn.getFunction(item.name);
                // decoding error parameters
                const decodedCustomErrorInputs = fn.decodeFunctionData(functionDesc, returnData);
                decodedCustomErrorInputsClean = {};
                let devdoc = {};
                // "contract" reprensents the compilation result containing the NATSPEC documentation
                if (contract && fn.functions && Object.keys(fn.functions).length) {
                  const functionSignature = Object.keys(fn.functions)[0];
                  // we check in the 'devdoc' if there's a developer documentation for this error
                  try {
                    devdoc = contract.devdoc.errors && contract.devdoc.errors[functionSignature][0] || {};
                  } catch (e) {
                    console.error(e.message);
                  }
                  // we check in the 'userdoc' if there's an user documentation for this error
                  try {
                    const userdoc = contract.userdoc.errors && contract.userdoc.errors[functionSignature][0] || {};
                    if (userdoc && userdoc.notice) customError += ' : ' + userdoc.notice; // we append the user doc if any
                  } catch (e) {
                    console.error(e.message);
                  }
                }
                let inputIndex = 0;
                for (const input of functionDesc.inputs) {
                  const inputKey = input.name || inputIndex;
                  const v = decodedCustomErrorInputs[inputKey];
                  decodedCustomErrorInputsClean[inputKey] = {
                    value: v.toString ? v.toString() : v
                  };
                  if (devdoc && devdoc.params) {
                    decodedCustomErrorInputsClean[input.name].documentation = devdoc.params[inputKey]; // we add the developer documentation for this input parameter if any
                  }

                  inputIndex++;
                }
                break;
              }
            }
          }
        }
      }
      if (decodedCustomErrorInputsClean) {
        msg = '\tThe transaction has been reverted to the initial state.\nError provided by the contract:';
        msg += `\n${customError}`;
        msg += '\nParameters:';
        msg += `\n${JSON.stringify(decodedCustomErrorInputsClean, null, ' ')}`;
      }
    }
    if (!customError) {
      // It is the hash of Error(string)
      if (returnData && returnDataHex === '08c379a0') {
        const abiCoder = new ethers_1.ethers.utils.AbiCoder();
        const reason = abiCoder.decode(['string'], returnData.slice(4))[0];
        msg = `\tThe transaction has been reverted to the initial state.\nReason provided by the contract: "${reason}".`;
      } else {
        msg = '\tThe transaction has been reverted to the initial state.\nNote: The called function should be payable if you send value and the value you send should be less than your current balance.';
      }
    }
    ret.error = true;
  } else if (exceptionError === errorCode.STATIC_STATE_CHANGE) {
    msg = '\tState changes is not allowed in Static Call context\n';
    ret.error = true;
  }
  ret.message = `${error}\n${exceptionError}\n${msg}\nDebug the transaction to get more information.`;
  return ret;
}
exports.checkVMError = checkVMError;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txFormat.js":
/*!*********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/txFormat.js ***!
  \*********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isArrayOrStringStart = exports.parseFunctionParams = exports.decodeResponse = exports.linkLibrary = exports.setLibraryAddress = exports.linkLibraryStandard = exports.linkLibraryStandardFromlinkReferences = exports.deployLibrary = exports.linkBytecode = exports.linkBytecodeLegacy = exports.linkBytecodeStandard = exports.atAddress = exports.buildData = exports.encodeConstructorCallAndDeployLibraries = exports.linkLibraries = exports.encodeConstructorCallAndLinkLibraries = exports.encodeFunctionCall = exports.encodeParams = exports.encodeData = void 0;
const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");
const txHelper_1 = __webpack_require__(/*! ./txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js");
const async_1 = __webpack_require__(/*! async */ "../../../node_modules/async/dist/async.js");
const linker_1 = __webpack_require__(/*! solc/linker */ "../../../node_modules/solc/linker.js");
const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");
/**
  * build the transaction data
  *
  * @param {Object} function abi
  * @param {Object} values to encode
  * @param {String} contractbyteCode
  */
function encodeData(funABI, values, contractbyteCode) {
  let encoded;
  let encodedHex;
  try {
    encoded = (0, txHelper_1.encodeParams)(funABI, values);
    encodedHex = encoded.toString('hex');
  } catch (e) {
    return {
      error: 'cannot encode arguments'
    };
  }
  if (contractbyteCode) {
    return {
      data: '0x' + contractbyteCode + encodedHex.replace('0x', '')
    };
  } else {
    return {
      data: (0, txHelper_1.encodeFunctionId)(funABI) + encodedHex.replace('0x', '')
    };
  }
}
exports.encodeData = encodeData;
/**
* encode function / constructor parameters
*
* @param {Object} params    - input paramater of the function to call
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Function} callback    - callback
*/
function encodeParams(params, funAbi, callback) {
  let data = '';
  let dataHex = '';
  let funArgs = [];
  if (Array.isArray(params)) {
    funArgs = params;
    if (funArgs.length > 0) {
      try {
        data = (0, txHelper_1.encodeParams)(funAbi, funArgs);
        dataHex = data.toString();
      } catch (e) {
        return callback('Error encoding arguments: ' + e);
      }
    }
    if (data.slice(0, 9) === 'undefined') {
      dataHex = data.slice(9);
    }
    if (data.slice(0, 2) === '0x') {
      dataHex = data.slice(2);
    }
  } else if (params.indexOf('raw:0x') === 0) {
    // in that case we consider that the input is already encoded and *does not* contain the method signature
    dataHex = params.replace('raw:0x', '');
    data = Buffer.from(dataHex, 'hex');
  } else {
    try {
      funArgs = parseFunctionParams(params);
    } catch (e) {
      return callback('Error encoding arguments: ' + e);
    }
    try {
      if (funArgs.length > 0) {
        data = (0, txHelper_1.encodeParams)(funAbi, funArgs);
        dataHex = data.toString();
      }
    } catch (e) {
      return callback('Error encoding arguments: ' + e);
    }
    if (data.slice(0, 9) === 'undefined') {
      dataHex = data.slice(9);
    }
    if (data.slice(0, 2) === '0x') {
      dataHex = data.slice(2);
    }
  }
  callback(null, {
    data: data,
    dataHex: dataHex,
    funArgs: funArgs
  });
}
exports.encodeParams = encodeParams;
/**
* encode function call (function id + encoded parameters)
*
* @param {Object} params    - input paramater of the function to call
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Function} callback    - callback
*/
function encodeFunctionCall(params, funAbi, callback) {
  encodeParams(params, funAbi, (error, encodedParam) => {
    if (error) return callback(error);
    callback(null, {
      dataHex: (0, txHelper_1.encodeFunctionId)(funAbi) + encodedParam.dataHex,
      funAbi,
      funArgs: encodedParam.funArgs
    });
  });
}
exports.encodeFunctionCall = encodeFunctionCall;
/**
* encode constructor creation and link with provided libraries if needed
*
* @param {Object} contract    - input paramater of the function to call
* @param {Object} params    - input paramater of the function to call
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Object} linkLibraries    - contains {linkReferences} object which list all the addresses to be linked
* @param {Object} linkReferences    - given by the compiler, contains the proper linkReferences
* @param {Function} callback    - callback
*/
function encodeConstructorCallAndLinkLibraries(contract, params, funAbi, linkLibrariesAddresses, linkReferences, callback) {
  encodeParams(params, funAbi, (error, encodedParam) => {
    if (error) return callback(error);
    linkLibraries(contract, linkLibrariesAddresses, linkReferences, (error, bytecodeToDeploy) => {
      callback(error, {
        dataHex: bytecodeToDeploy + encodedParam.dataHex,
        funAbi,
        funArgs: encodedParam.funArgs,
        contractBytecode: contract.evm.bytecode.object
      });
    });
  });
}
exports.encodeConstructorCallAndLinkLibraries = encodeConstructorCallAndLinkLibraries;
/**
* link with provided libraries if needed
*
* @param {Object} contract    - input paramater of the function to call
* @param {Object} linkLibraries    - contains {linkReferences} object which list all the addresses to be linked
* @param {Object} linkReferences    - given by the compiler, contains the proper linkReferences
* @param {Function} callback    - callback
*/
function linkLibraries(contract, linkLibraries, linkReferences, callback) {
  let bytecodeToDeploy = contract.evm.bytecode.object;
  if (bytecodeToDeploy.indexOf('_') >= 0) {
    if (linkLibraries && linkReferences) {
      for (const libFile in linkLibraries) {
        for (const lib in linkLibraries[libFile]) {
          const address = linkLibraries[libFile][lib];
          if (!(0, ethereumjs_util_1.isValidAddress)(address)) return callback(address + ' is not a valid address. Please check the provided address is valid.');
          bytecodeToDeploy = linkLibraryStandardFromlinkReferences(lib, address.replace('0x', ''), bytecodeToDeploy, linkReferences);
        }
      }
    }
  }
  if (bytecodeToDeploy.indexOf('_') >= 0) {
    return callback('Failed to link some libraries');
  }
  return callback(null, bytecodeToDeploy);
}
exports.linkLibraries = linkLibraries;
/**
* encode constructor creation and deploy librairies if needed
*
* @param {String} contractName    - current contract name
* @param {Object} contract    - input paramater of the function to call
* @param {Object} contracts    - map of all compiled contracts.
* @param {Object} params    - input paramater of the function to call
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Function} callback    - callback
* @param {Function} callbackStep  - callbackStep
* @param {Function} callbackDeployLibrary  - callbackDeployLibrary
* @param {Function} callback    - callback
*/
function encodeConstructorCallAndDeployLibraries(contractName, contract, contracts, params, funAbi, callback, callbackStep, callbackDeployLibrary) {
  encodeParams(params, funAbi, (error, encodedParam) => {
    if (error) return callback(error);
    let dataHex = '';
    const contractBytecode = contract.evm.bytecode.object;
    let bytecodeToDeploy = contract.evm.bytecode.object;
    if (bytecodeToDeploy.indexOf('_') >= 0) {
      linkBytecode(contract, contracts, (err, bytecode) => {
        if (err) {
          callback('Error deploying required libraries: ' + err);
        } else {
          bytecodeToDeploy = bytecode + dataHex;
          return callback(null, {
            dataHex: bytecodeToDeploy,
            funAbi,
            funArgs: encodedParam.funArgs,
            contractBytecode,
            contractName: contractName
          });
        }
      }, callbackStep, callbackDeployLibrary);
      return;
    } else {
      dataHex = bytecodeToDeploy + encodedParam.dataHex;
    }
    callback(null, {
      dataHex: bytecodeToDeploy,
      funAbi,
      funArgs: encodedParam.funArgs,
      contractBytecode,
      contractName: contractName
    });
  });
}
exports.encodeConstructorCallAndDeployLibraries = encodeConstructorCallAndDeployLibraries;
/**
* (DEPRECATED) build the transaction data
*
* @param {String} contractName
* @param {Object} contract    - abi definition of the current contract.
* @param {Object} contracts    - map of all compiled contracts.
* @param {Bool} isConstructor    - isConstructor.
* @param {Object} funAbi    - abi definition of the function to call. null if building data for the ctor.
* @param {Object} params    - input paramater of the function to call
* @param {Function} callback    - callback
* @param {Function} callbackStep  - callbackStep
* @param {Function} callbackDeployLibrary  - callbackDeployLibrary
*/
function buildData(contractName, contract, contracts, isConstructor, funAbi, params, callback, callbackStep, callbackDeployLibrary) {
  let funArgs = [];
  let data = '';
  let dataHex = '';
  if (params.indexOf('raw:0x') === 0) {
    // in that case we consider that the input is already encoded and *does not* contain the method signature
    dataHex = params.replace('raw:0x', '');
    data = Buffer.from(dataHex, 'hex');
  } else {
    try {
      if (params.length > 0) {
        funArgs = parseFunctionParams(params);
      }
    } catch (e) {
      return callback('Error encoding arguments: ' + e);
    }
    try {
      data = (0, txHelper_1.encodeParams)(funAbi, funArgs);
      dataHex = data.toString();
    } catch (e) {
      return callback('Error encoding arguments: ' + e);
    }
    if (data.slice(0, 9) === 'undefined') {
      dataHex = data.slice(9);
    }
    if (data.slice(0, 2) === '0x') {
      dataHex = data.slice(2);
    }
  }
  let contractBytecode;
  if (isConstructor) {
    contractBytecode = contract.evm.bytecode.object;
    let bytecodeToDeploy = contract.evm.bytecode.object;
    if (bytecodeToDeploy.indexOf('_') >= 0) {
      linkBytecode(contract, contracts, (err, bytecode) => {
        if (err) {
          callback('Error deploying required libraries: ' + err);
        } else {
          bytecodeToDeploy = bytecode + dataHex;
          return callback(null, {
            dataHex: bytecodeToDeploy,
            funAbi,
            funArgs,
            contractBytecode,
            contractName: contractName
          });
        }
      }, callbackStep, callbackDeployLibrary);
      return;
    } else {
      dataHex = bytecodeToDeploy + dataHex;
    }
  } else {
    dataHex = (0, txHelper_1.encodeFunctionId)(funAbi) + dataHex;
  }
  callback(null, {
    dataHex,
    funAbi,
    funArgs,
    contractBytecode,
    contractName: contractName
  });
}
exports.buildData = buildData;
function atAddress() {}
exports.atAddress = atAddress;
function linkBytecodeStandard(contract, contracts, callback, callbackStep, callbackDeployLibrary) {
  let contractBytecode = contract.evm.bytecode.object;
  (0, async_1.eachOfSeries)(contract.evm.bytecode.linkReferences, (libs, file, cbFile) => {
    (0, async_1.eachOfSeries)(contract.evm.bytecode.linkReferences[file], (libRef, libName, cbLibDeployed) => {
      const library = contracts[file][libName];
      if (library) {
        deployLibrary(file + ':' + libName, libName, library, contracts, (error, address) => {
          if (error) {
            return cbLibDeployed(error);
          }
          let hexAddress = address.toString('hex');
          if (hexAddress.slice(0, 2) === '0x') {
            hexAddress = hexAddress.slice(2);
          }
          contractBytecode = linkLibraryStandard(libName, hexAddress, contractBytecode, contract);
          cbLibDeployed();
        }, callbackStep, callbackDeployLibrary);
      } else {
        //@ts-ignore
        cbLibDeployed('Cannot find compilation data of library ' + libName);
      }
    }, error => {
      cbFile(error);
    });
  }, error => {
    if (error) {
      callbackStep(error);
    }
    callback(error, contractBytecode);
  });
}
exports.linkBytecodeStandard = linkBytecodeStandard;
function linkBytecodeLegacy(contract, contracts, callback, callbackStep, callbackDeployLibrary) {
  const libraryRefMatch = contract.evm.bytecode.object.match(/__([^_]{1,36})__/);
  if (!libraryRefMatch) {
    return callback('Invalid bytecode format.');
  }
  const libraryName = libraryRefMatch[1];
  // file_name:library_name
  const libRef = libraryName.match(/(.*):(.*)/);
  if (!libRef) {
    return callback('Cannot extract library reference ' + libraryName);
  }
  if (!contracts[libRef[1]] || !contracts[libRef[1]][libRef[2]]) {
    return callback('Cannot find library reference ' + libraryName);
  }
  const libraryShortName = libRef[2];
  const library = contracts[libRef[1]][libraryShortName];
  if (!library) {
    return callback('Library ' + libraryName + ' not found.');
  }
  deployLibrary(libraryName, libraryShortName, library, contracts, (err, address) => {
    if (err) {
      return callback(err);
    }
    let hexAddress = address.toString('hex');
    if (hexAddress.slice(0, 2) === '0x') {
      hexAddress = hexAddress.slice(2);
    }
    contract.evm.bytecode.object = linkLibrary(libraryName, hexAddress, contract.evm.bytecode.object);
    linkBytecode(contract, contracts, callback, callbackStep, callbackDeployLibrary);
  }, callbackStep, callbackDeployLibrary);
}
exports.linkBytecodeLegacy = linkBytecodeLegacy;
function linkBytecode(contract, contracts, callback, callbackStep, callbackDeployLibrary) {
  if (contract.evm.bytecode.object.indexOf('_') < 0) {
    return callback(null, contract.evm.bytecode.object);
  }
  if (contract.evm.bytecode.linkReferences && Object.keys(contract.evm.bytecode.linkReferences).length) {
    linkBytecodeStandard(contract, contracts, callback, callbackStep, callbackDeployLibrary);
  } else {
    linkBytecodeLegacy(contract, contracts, callback, callbackStep, callbackDeployLibrary);
  }
}
exports.linkBytecode = linkBytecode;
function deployLibrary(libraryName, libraryShortName, library, contracts, callback, callbackStep, callbackDeployLibrary) {
  const address = library.address;
  if (address) {
    return callback(null, address);
  }
  const bytecode = library.evm.bytecode.object;
  if (bytecode.indexOf('_') >= 0) {
    linkBytecode(library, contracts, (err, bytecode) => {
      if (err) callback(err);else {
        library.evm.bytecode.object = bytecode;
        deployLibrary(libraryName, libraryShortName, library, contracts, callback, callbackStep, callbackDeployLibrary);
      }
    }, callbackStep, callbackDeployLibrary);
  } else {
    callbackStep(`creation of library ${libraryName} pending...`);
    const data = {
      dataHex: bytecode,
      funAbi: {
        type: 'constructor'
      },
      funArgs: [],
      contractBytecode: bytecode,
      contractName: libraryShortName,
      contractABI: library.abi
    };
    callbackDeployLibrary({
      data: data,
      useCall: false
    }, (err, txResult) => {
      if (err) {
        return callback(err);
      }
      const address = txResult.receipt.contractAddress;
      library.address = address;
      callback(err, address);
    });
  }
}
exports.deployLibrary = deployLibrary;
function linkLibraryStandardFromlinkReferences(libraryName, address, bytecode, linkReferences) {
  for (const file in linkReferences) {
    for (const libName in linkReferences[file]) {
      if (libraryName === libName) {
        bytecode = setLibraryAddress(address, bytecode, linkReferences[file][libName]);
      }
    }
  }
  return bytecode;
}
exports.linkLibraryStandardFromlinkReferences = linkLibraryStandardFromlinkReferences;
function linkLibraryStandard(libraryName, address, bytecode, contract) {
  return linkLibraryStandardFromlinkReferences(libraryName, address, bytecode, contract.evm.bytecode.linkReferences);
}
exports.linkLibraryStandard = linkLibraryStandard;
function setLibraryAddress(address, bytecodeToLink, positions) {
  if (positions) {
    for (const pos of positions) {
      const regpos = bytecodeToLink.match(new RegExp(`(.{${2 * pos.start}})(.{${2 * pos.length}})(.*)`));
      if (regpos) {
        bytecodeToLink = regpos[1] + address + regpos[3];
      }
    }
  }
  return bytecodeToLink;
}
exports.setLibraryAddress = setLibraryAddress;
function linkLibrary(libraryName, address, bytecodeToLink) {
  return (0, linker_1.linkBytecode)(bytecodeToLink, {
    [libraryName]: (0, ethereumjs_util_1.addHexPrefix)(address)
  });
}
exports.linkLibrary = linkLibrary;
function decodeResponse(response, fnabi) {
  // Only decode if there supposed to be fields
  if (fnabi.outputs && fnabi.outputs.length > 0) {
    try {
      let i;
      const outputTypes = [];
      for (i = 0; i < fnabi.outputs.length; i++) {
        const type = fnabi.outputs[i].type;
        outputTypes.push(type.indexOf('tuple') === 0 ? (0, txHelper_1.makeFullTypeDefinition)(fnabi.outputs[i]) : type);
      }
      if (!response || !response.length) response = new Uint8Array(32 * fnabi.outputs.length); // ensuring the data is at least filled by 0 cause `AbiCoder` throws if there's not engouh data
      // decode data
      const abiCoder = new ethers_1.ethers.utils.AbiCoder();
      const decodedObj = abiCoder.decode(outputTypes, response);
      const json = {};
      for (i = 0; i < outputTypes.length; i++) {
        const name = fnabi.outputs[i].name;
        json[i] = outputTypes[i] + ': ' + (name ? name + ' ' + decodedObj[i] : decodedObj[i]);
      }
      return json;
    } catch (e) {
      return {
        error: 'Failed to decode output: ' + e
      };
    }
  }
  return {};
}
exports.decodeResponse = decodeResponse;
function parseFunctionParams(params) {
  const args = [];
  // Check if parameter string starts with array or string
  let startIndex = isArrayOrStringStart(params, 0) ? -1 : 0;
  for (let i = 0; i < params.length; i++) {
    // If a quote is received
    if (params.charAt(i) === '"') {
      startIndex = -1;
      let endQuoteIndex = false;
      // look for closing quote. On success, push the complete string in arguments list
      for (let j = i + 1; !endQuoteIndex; j++) {
        if (params.charAt(j) === '"') {
          args.push(params.substring(i + 1, j));
          endQuoteIndex = true;
          i = j;
        }
        // Throw error if end of params string is arrived but couldn't get end quote
        if (!endQuoteIndex && j === params.length - 1) {
          throw new Error('invalid params');
        }
      }
    } else if (params.charAt(i) === '[') {
      // If an array/struct opening bracket is received
      startIndex = -1;
      let bracketCount = 1;
      let j;
      for (j = i + 1; bracketCount !== 0; j++) {
        // Increase count if another array opening bracket is received (To handle nested array)
        if (params.charAt(j) === '[') {
          bracketCount++;
        } else if (params.charAt(j) === ']') {
          // // Decrease count if an array closing bracket is received (To handle nested array)
          bracketCount--;
        }
        // Throw error if end of params string is arrived but couldn't get end of tuple
        if (bracketCount !== 0 && j === params.length - 1) {
          throw new Error('invalid tuple params');
        }
        if (bracketCount === 0) break;
      }
      args.push(parseFunctionParams(params.substring(i + 1, j)));
      i = j - 1;
    } else if (params.charAt(i) === ',' || i === params.length - 1) {
      // , or end of string
      // if startIndex >= 0, it means a parameter was being parsed, it can be first or other parameter
      if (startIndex >= 0) {
        let param = params.substring(startIndex, i === params.length - 1 ? undefined : i);
        const trimmed = param.trim();
        if (param.startsWith('0x')) param = `${param}`;
        if (/[0-9]/g.test(trimmed)) param = `${trimmed}`;
        if (typeof param === 'string') {
          if (trimmed === 'true') param = true;
          if (trimmed === 'false') param = false;
        }
        args.push(param);
      }
      // Register start index of a parameter to parse
      startIndex = isArrayOrStringStart(params, i + 1) ? -1 : i + 1;
    }
  }
  return args;
}
exports.parseFunctionParams = parseFunctionParams;
function isArrayOrStringStart(str, index) {
  return str.charAt(index) === '"' || str.charAt(index) === '[';
}
exports.isArrayOrStringStart = isArrayOrStringStart;
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../../node_modules/node-libs-browser/node_modules/buffer/index.js */ "../../../node_modules/node-libs-browser/node_modules/buffer/index.js").Buffer))

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txHelper.js":
/*!*********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/txHelper.js ***!
  \*********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.inputParametersDeclarationToString = exports.visitContracts = exports.getContract = exports.getReceiveInterface = exports.getFallbackInterface = exports.getFunction = exports.getFunctionLiner = exports.extractSize = exports.serializeInputs = exports.getConstructorInterface = exports.sortAbiFunction = exports.getFunctionFragment = exports.encodeFunctionId = exports.encodeParams = exports.makeFullTypeDefinition = void 0;
const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");
function makeFullTypeDefinition(typeDef) {
  if (typeDef && typeDef.type.indexOf('tuple') === 0 && typeDef.components) {
    const innerTypes = typeDef.components.map(innerType => {
      return makeFullTypeDefinition(innerType);
    });
    return `tuple(${innerTypes.join(',')})${extractSize(typeDef.type)}`;
  }
  return typeDef.type;
}
exports.makeFullTypeDefinition = makeFullTypeDefinition;
function encodeParams(funABI, args) {
  const types = [];
  if (funABI.inputs && funABI.inputs.length) {
    for (let i = 0; i < funABI.inputs.length; i++) {
      const type = funABI.inputs[i].type;
      // "false" will be converting to `false` and "true" will be working
      // fine as abiCoder assume anything in quotes as `true`
      if (type === 'bool' && args[i] === 'false') {
        args[i] = false;
      }
      types.push(type.indexOf('tuple') === 0 ? makeFullTypeDefinition(funABI.inputs[i]) : type);
      if (args.length < types.length) {
        args.push('');
      }
    }
  }
  // NOTE: the caller will concatenate the bytecode and this
  //       it could be done here too for consistency
  const abiCoder = new ethers_1.ethers.utils.AbiCoder();
  return abiCoder.encode(types, args);
}
exports.encodeParams = encodeParams;
function encodeFunctionId(funABI) {
  if (funABI.type === 'fallback' || funABI.type === 'receive') return '0x';
  const abi = new ethers_1.ethers.utils.Interface([funABI]);
  return abi.getSighash(funABI.name);
}
exports.encodeFunctionId = encodeFunctionId;
function getFunctionFragment(funABI) {
  if (funABI.type === 'fallback' || funABI.type === 'receive') return null;
  return new ethers_1.ethers.utils.Interface([funABI]);
}
exports.getFunctionFragment = getFunctionFragment;
function sortAbiFunction(contractabi) {
  // Check if function is constant (introduced with Solidity 0.6.0)
  const isConstant = ({
    stateMutability
  }) => stateMutability === 'view' || stateMutability === 'pure';
  // Sorts the list of ABI entries. Constant functions will appear first,
  // followed by non-constant functions. Within those t wo groupings, functions
  // will be sorted by their names.
  return contractabi.sort(function (a, b) {
    if (isConstant(a) && !isConstant(b)) {
      return 1;
    } else if (isConstant(b) && !isConstant(a)) {
      return -1;
    }
    // If we reach here, either a and b are both constant or both not; sort by name then
    // special case for fallback, receive and constructor function
    if (a.type === 'function' && typeof a.name !== 'undefined') {
      return a.name.localeCompare(b.name);
    } else if (a.type === 'constructor' || a.type === 'fallback' || a.type === 'receive') {
      return 1;
    }
  });
}
exports.sortAbiFunction = sortAbiFunction;
function getConstructorInterface(abi) {
  const funABI = {
    name: '',
    inputs: [],
    type: 'constructor',
    payable: false,
    outputs: []
  };
  if (typeof abi === 'string') {
    try {
      abi = JSON.parse(abi);
    } catch (e) {
      console.log('exception retrieving ctor abi ' + abi);
      return funABI;
    }
  }
  for (let i = 0; i < abi.length; i++) {
    if (abi[i].type === 'constructor') {
      funABI.inputs = abi[i].inputs || [];
      funABI.payable = abi[i].payable;
      funABI['stateMutability'] = abi[i].stateMutability;
      break;
    }
  }
  return funABI;
}
exports.getConstructorInterface = getConstructorInterface;
function serializeInputs(fnAbi) {
  let serialized = '(';
  if (fnAbi.inputs && fnAbi.inputs.length) {
    serialized += fnAbi.inputs.map(input => {
      return input.type;
    }).join(',');
  }
  serialized += ')';
  return serialized;
}
exports.serializeInputs = serializeInputs;
function extractSize(type) {
  const size = type.match(/([a-zA-Z0-9])(\[.*\])/);
  return size ? size[2] : '';
}
exports.extractSize = extractSize;
function getFunctionLiner(fn, detailTuple = true) {
  /*
    if detailsTuple is True, this will return something like fnName((uint, string))
    if detailsTuple is False, this will return something like fnName(tuple)
  */
  return fn.name + '(' + fn.inputs.map(value => {
    if (detailTuple && value.components) {
      const fullType = makeFullTypeDefinition(value);
      return fullType.replace(/tuple/g, ''); // return of makeFullTypeDefinition might contain `tuple`, need to remove it cause `methodIdentifier` (fnName) does not include `tuple` keyword
    } else {
      return value.type;
    }
  }).join(',') + ')';
}
exports.getFunctionLiner = getFunctionLiner;
function getFunction(abi, fnName) {
  for (let i = 0; i < abi.length; i++) {
    const fn = abi[i];
    if (fn.type === 'function' && (fnName === getFunctionLiner(fn, true) || fnName === getFunctionLiner(fn, false))) {
      return fn;
    }
  }
  return null;
}
exports.getFunction = getFunction;
function getFallbackInterface(abi) {
  for (let i = 0; i < abi.length; i++) {
    if (abi[i].type === 'fallback') {
      return abi[i];
    }
  }
}
exports.getFallbackInterface = getFallbackInterface;
function getReceiveInterface(abi) {
  for (let i = 0; i < abi.length; i++) {
    if (abi[i].type === 'receive') {
      return abi[i];
    }
  }
}
exports.getReceiveInterface = getReceiveInterface;
/**
  * return the contract obj of the given @arg name. Uses last compilation result.
  * return null if not found
  * @param {String} name    - contract name
  * @returns contract obj and associated file: { contract, file } or null
  */
function getContract(contractName, contracts) {
  for (const file in contracts) {
    if (contracts[file][contractName]) {
      return {
        object: contracts[file][contractName],
        file: file
      };
    }
  }
  return null;
}
exports.getContract = getContract;
/**
  * call the given @arg cb (function) for all the contracts. Uses last compilation result
  * stop visiting when cb return true
  * @param {Function} cb    - callback
  */
function visitContracts(contracts, cb) {
  for (const file in contracts) {
    for (const name in contracts[file]) {
      if (cb({
        name: name,
        object: contracts[file][name],
        file: file
      })) return;
    }
  }
}
exports.visitContracts = visitContracts;
function inputParametersDeclarationToString(abiinputs) {
  const inputs = (abiinputs || []).map(inp => inp.type + ' ' + inp.name);
  return inputs.join(', ');
}
exports.inputParametersDeclarationToString = inputParametersDeclarationToString;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txListener.js":
/*!***********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/txListener.js ***!
  \***********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TxListener = void 0;
const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");
const ethers_1 = __webpack_require__(/*! ethers */ "../../../node_modules/ethers/lib.esm/index.js");
const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");
const eventManager_1 = __webpack_require__(/*! ../eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");
const util_1 = __webpack_require__(/*! ../util */ "../../../dist/libs/remix-lib/src/util.js");
const txFormat_1 = __webpack_require__(/*! ./txFormat */ "../../../dist/libs/remix-lib/src/execution/txFormat.js");
const txHelper_1 = __webpack_require__(/*! ./txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js");
function addExecutionCosts(txResult, tx, execResult) {
  if (txResult) {
    if (execResult) {
      tx.returnValue = execResult.returnValue;
      if (execResult.gasUsed) tx.executionCost = execResult.gasUsed.toString(10);
    }
    if (txResult.receipt && txResult.receipt.gasUsed) tx.transactionCost = txResult.receipt.gasUsed.toString(10);
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
    this.executionContext.event.register('contextChanged', context => {
      if (this._isListening) {
        this.stopListening();
        this.startListening();
      }
    });
    opt.event.udapp.register('callExecuted', (error, from, to, data, lookupOnly, txResult) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      if (error) return;
      // we go for that case if
      // in VM mode
      // in web3 mode && listen remix txs only
      if (!this._isListening) return; // we don't listen
      if (this._loopId) return; // we seems to already listen on a "web3" network
      let returnValue;
      let execResult;
      if (this.executionContext.isVM()) {
        execResult = yield this.executionContext.web3().eth.getExecutionResultFromSimulator(txResult.transactionHash);
        returnValue = execResult.returnValue;
      } else {
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
      if (error) return;
      if (lookupOnly) return;
      // we go for that case if
      // in VM mode
      // in web3 mode && listen remix txs only
      if (!this._isListening) return; // we don't listen
      if (this._loopId) return; // we seems to already listen on a "web3" network
      this.executionContext.web3().eth.getTransaction(txResult.transactionHash, (error, tx) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        if (error) return console.log(error);
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
        if (!this._isListening) return;
        if (processingBlock) return;
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
              if (!this._isListening) break;
              yield this._manageBlock(lastSeenBlock);
            } catch (e) {
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
        return yield this._newBlock(Object.assign({
          type: 'web3'
        }, result));
      } catch (e) {}
    });
  }
  /**
    * try to resolve the contract name from the given @arg address
    *
    * @param {String} address - contract address to resolve
    * @return {String} - contract name
    */
  resolvedContract(address) {
    if (this._resolvedContracts[address]) return this._resolvedContracts[address].name;
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
        if (error) return reject(error);
        this._resolveTx(tx, receipt, (error, resolvedData) => {
          if (error) return reject(error);
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
          if (!this._isListening) break;
          yield this._resolveAsync(tx);
        } catch (e) {}
      }
    });
  }
  _resolveTx(tx, receipt, cb) {
    const contracts = this._api.contracts();
    if (!contracts) return cb();
    let fun;
    let contract;
    if (!tx.to || tx.to === '0x0') {
      // testrpc returns 0x0 in that case
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
        return cb(null, {
          to: null,
          contractName: contract.name,
          function: fun,
          creationAddress: address
        });
      }
      return cb();
    } else {
      // first check known contract, resolve against the `runtimeBytecode` if not known
      contract = this._resolvedContracts[tx.to];
      if (!contract) {
        this.executionContext.web3().eth.getCode(tx.to, (error, code) => {
          if (error) return cb(error);
          if (code) {
            const contract = this._tryResolveContract(code, contracts, false);
            if (contract) {
              this._resolvedContracts[tx.to] = contract;
              const fun = this._resolveFunction(contract, tx, false);
              return cb(null, {
                to: tx.to,
                contractName: contract.name,
                function: fun
              });
            }
          }
          return cb();
        });
        return;
      }
      if (contract) {
        fun = this._resolveFunction(contract, tx, false);
        return cb(null, {
          to: tx.to,
          contractName: contract.name,
          function: fun
        });
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
      } else {
        // fallback function
        this._resolvedTransactions[tx.hash] = {
          contractName: contract.name,
          to: tx.to,
          fn: '(fallback)',
          params: null
        };
      }
    } else {
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
    (0, txHelper_1.visitContracts)(compiledContracts, contract => {
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
    if (!data.length) data = new Uint8Array(32 * abi.inputs.length); // ensuring the data is at least filled by 0 cause `AbiCoder` throws if there's not engouh data
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

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txRunner.js":
/*!*********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/txRunner.js ***!
  \*********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TxRunner = void 0;
const eventManager_1 = __webpack_require__(/*! ../eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");
class TxRunner {
  constructor(internalRunner, opt) {
    this.opt = opt || {};
    this.internalRunner = internalRunner;
    this.event = new eventManager_1.EventManager();
    this.runAsync = this.opt.runAsync || true; // We have to run like this cause the VM Event Manager does not support running multiple txs at the same time.
    this.pendingTxs = {};
    this.queusTxs = [];
  }
  rawRun(args, confirmationCb, gasEstimationForceSend, promptCb, cb) {
    run(this, args, args.timestamp || Date.now(), confirmationCb, gasEstimationForceSend, promptCb, cb);
  }
  execute(args, confirmationCb, gasEstimationForceSend, promptCb, callback) {
    let data = args.data;
    if (data.slice(0, 2) !== '0x') {
      data = '0x' + data;
    }
    this.internalRunner.execute(args, confirmationCb, gasEstimationForceSend, promptCb, callback);
  }
}
exports.TxRunner = TxRunner;
function run(self, tx, stamp, confirmationCb, gasEstimationForceSend = null, promptCb = null, callback = null) {
  if (!self.runAsync && Object.keys(self.pendingTxs).length) {
    return self.queusTxs.push({
      tx,
      stamp,
      callback
    });
  }
  self.pendingTxs[stamp] = tx;
  self.execute(tx, confirmationCb, gasEstimationForceSend, promptCb, function (error, result) {
    delete self.pendingTxs[stamp];
    if (callback && typeof callback === 'function') callback(error, result);
    if (self.queusTxs.length) {
      const next = self.queusTxs.pop();
      run(self, next.tx, next.stamp, next.callback);
    }
  });
}

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txRunnerVM.js":
/*!***********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/txRunnerVM.js ***!
  \***********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TxRunnerVM = void 0;
const tx_1 = __webpack_require__(/*! @ethereumjs/tx */ "../../../node_modules/@ethereumjs/tx/dist.browser/index.js");
const block_1 = __webpack_require__(/*! @ethereumjs/block */ "../../../node_modules/@ethereumjs/block/dist.browser/index.js");
const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");
const eventManager_1 = __webpack_require__(/*! ../eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");
const logsManager_1 = __webpack_require__(/*! ./logsManager */ "../../../dist/libs/remix-lib/src/execution/logsManager.js");
class TxRunnerVM {
  constructor(vmaccounts, api, getVMObject) {
    this.event = new eventManager_1.EventManager();
    this.logsManager = new logsManager_1.LogsManager();
    // has a default for now for backwards compatability
    this.getVMObject = getVMObject;
    this.commonContext = this.getVMObject().common;
    this.blockNumber = 0;
    this.runAsync = true;
    this.blockNumber = 0; // The VM is running in Homestead mode, which started at this block.
    this.runAsync = false; // We have to run like this cause the VM Event Manager does not support running multiple txs at the same time.
    this.pendingTxs = {};
    this.vmaccounts = vmaccounts;
    this.queusTxs = [];
    this.blocks = [];
    /*
      txHash is generated using the nonce,
      in order to have unique transaction hash, we need to keep using different nonce (in case of a call)
      so we increment this value after each call.
      For this to function we also need to skip nonce validation, in the vm: `{ skipNonce: true }`
    */
    this.nextNonceForCall = 0;
  }
  execute(args, confirmationCb, gasEstimationForceSend, promptCb, callback) {
    let data = args.data;
    if (data.slice(0, 2) !== '0x') {
      data = '0x' + data;
    }
    try {
      this.runInVm(args.from, args.to, data, args.value, args.gasLimit, args.useCall, args.timestamp, callback);
    } catch (e) {
      callback(e, null);
    }
  }
  runInVm(from, to, data, value, gasLimit, useCall, timestamp, callback) {
    const self = this;
    let account;
    if (!from && useCall && Object.keys(self.vmaccounts).length) {
      from = Object.keys(self.vmaccounts)[0];
      account = self.vmaccounts[from];
    } else account = self.vmaccounts[from];
    if (!account) {
      return callback('Invalid account selected');
    }
    if (Number.isInteger(gasLimit)) {
      gasLimit = '0x' + gasLimit.toString(16);
    }
    this.getVMObject().stateManager.getAccount(ethereumjs_util_1.Address.fromString(from)).then(res => {
      // See https://github.com/ethereumjs/ethereumjs-tx/blob/master/docs/classes/transaction.md#constructor
      // for initialization fields and their types
      if (!value) value = 0;
      if (typeof value === 'string') {
        if (value.startsWith('0x')) value = new ethereumjs_util_1.BN(value.replace('0x', ''), 'hex');else {
          try {
            value = new ethereumjs_util_1.BN(value, 10);
          } catch (e) {
            return callback('Unable to parse the value ' + e.message);
          }
        }
      }
      const EIP1559 = this.commonContext.hardfork() !== 'berlin'; // berlin is the only pre eip1559 fork that we handle.
      let tx;
      if (!EIP1559) {
        tx = tx_1.Transaction.fromTxData({
          nonce: useCall ? this.nextNonceForCall : new ethereumjs_util_1.BN(res.nonce),
          gasPrice: '0x1',
          gasLimit: gasLimit,
          to: to,
          value: value,
          data: Buffer.from(data.slice(2), 'hex')
        }, {
          common: this.commonContext
        }).sign(account.privateKey);
      } else {
        tx = tx_1.FeeMarketEIP1559Transaction.fromTxData({
          nonce: useCall ? this.nextNonceForCall : new ethereumjs_util_1.BN(res.nonce),
          maxPriorityFeePerGas: '0x01',
          maxFeePerGas: '0x1',
          gasLimit: gasLimit,
          to: to,
          value: value,
          data: Buffer.from(data.slice(2), 'hex')
        }).sign(account.privateKey);
      }
      if (useCall) this.nextNonceForCall++;
      const coinbases = ['0x0e9281e9c6a0808672eaba6bd1220e144c9bb07a', '0x8945a1288dc78a6d8952a92c77aee6730b414778', '0x94d76e24f818426ae84aa404140e8d5f60e10e7e'];
      const difficulties = [new ethereumjs_util_1.BN('69762765929000', 10), new ethereumjs_util_1.BN('70762765929000', 10), new ethereumjs_util_1.BN('71762765929000', 10)];
      const block = block_1.Block.fromBlockData({
        header: {
          timestamp: timestamp || new Date().getTime() / 1000 | 0,
          number: self.blockNumber,
          coinbase: coinbases[self.blockNumber % coinbases.length],
          difficulty: difficulties[self.blockNumber % difficulties.length],
          gasLimit: new ethereumjs_util_1.BN(gasLimit.replace('0x', ''), 16).imuln(2),
          baseFeePerGas: EIP1559 ? '0x1' : undefined
        },
        transactions: [tx]
      }, {
        common: this.commonContext
      });
      if (!useCall) {
        ++self.blockNumber;
        this.runBlockInVm(tx, block, callback);
      } else {
        this.getVMObject().stateManager.checkpoint().then(() => {
          this.runBlockInVm(tx, block, (err, result) => {
            this.getVMObject().stateManager.revert().then(() => {
              callback(err, result);
            });
          });
        });
      }
    }).catch(e => {
      callback(e);
    });
  }
  runBlockInVm(tx, block, callback) {
    this.getVMObject().vm.runBlock({
      block: block,
      generate: true,
      skipBlockValidation: true,
      skipBalance: false,
      skipNonce: true
    }).then(results => {
      const result = results.results[0];
      if (result) {
        const status = result.execResult.exceptionError ? 0 : 1;
        result.status = `0x${status}`;
      }
      callback(null, {
        result: result,
        transactionHash: (0, ethereumjs_util_1.bufferToHex)(Buffer.from(tx.hash())),
        block,
        tx
      });
    }).catch(function (err) {
      callback(err);
    });
  }
}
exports.TxRunnerVM = TxRunnerVM;
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../../node_modules/node-libs-browser/node_modules/buffer/index.js */ "../../../node_modules/node-libs-browser/node_modules/buffer/index.js").Buffer))

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/txRunnerWeb3.js":
/*!*************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/txRunnerWeb3.js ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TxRunnerWeb3 = void 0;
const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");
const eventManager_1 = __webpack_require__(/*! ../eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");
class TxRunnerWeb3 {
  constructor(api, getWeb3, currentblockGasLimit) {
    this.event = new eventManager_1.EventManager();
    this.getWeb3 = getWeb3;
    this.currentblockGasLimit = currentblockGasLimit;
    this._api = api;
  }
  _executeTx(tx, network, txFee, api, promptCb, callback) {
    if (network && network.lastBlock && network.lastBlock.baseFeePerGas) {
      // the sending stack (web3.js / metamask need to have the type defined)
      // this is to avoid the following issue: https://github.com/MetaMask/metamask-extension/issues/11824
      tx.type = '0x2';
    }
    if (txFee) {
      if (txFee.baseFeePerGas) {
        tx.maxPriorityFeePerGas = this.getWeb3().utils.toHex(this.getWeb3().utils.toWei(txFee.maxPriorityFee, 'gwei'));
        tx.maxFeePerGas = this.getWeb3().utils.toHex(this.getWeb3().utils.toWei(txFee.maxFee, 'gwei'));
        tx.type = '0x2';
      } else {
        tx.gasPrice = this.getWeb3().utils.toHex(this.getWeb3().utils.toWei(txFee.gasPrice, 'gwei'));
        tx.type = '0x1';
      }
    }
    if (api.personalMode()) {
      promptCb(value => {
        this._sendTransaction(this.getWeb3().personal.sendTransaction, tx, value, callback);
      }, () => {
        return callback('Canceled by user.');
      });
    } else {
      this._sendTransaction(this.getWeb3().eth.sendTransaction, tx, null, callback);
    }
  }
  _sendTransaction(sendTx, tx, pass, callback) {
    const cb = (err, resp) => {
      if (err) {
        return callback(err, resp);
      }
      this.event.trigger('transactionBroadcasted', [resp]);
      const listenOnResponse = () => {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise((resolve, reject) => (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
          const receipt = yield tryTillReceiptAvailable(resp, this.getWeb3());
          tx = yield tryTillTxAvailable(resp, this.getWeb3());
          resolve({
            receipt,
            tx,
            transactionHash: receipt ? receipt['transactionHash'] : null
          });
        }));
      };
      listenOnResponse().then(txData => {
        callback(null, txData);
      }).catch(error => {
        callback(error);
      });
    };
    const args = pass !== null ? [tx, pass, cb] : [tx, cb];
    try {
      sendTx.apply({}, args);
    } catch (e) {
      return callback(`Send transaction failed: ${e.message} . if you use an injected provider, please check it is properly unlocked. `);
    }
  }
  execute(args, confirmationCb, gasEstimationForceSend, promptCb, callback) {
    let data = args.data;
    if (data.slice(0, 2) !== '0x') {
      data = '0x' + data;
    }
    return this.runInNode(args.from, args.to, data, args.value, args.gasLimit, args.useCall, args.timestamp, confirmationCb, gasEstimationForceSend, promptCb, callback);
  }
  runInNode(from, to, data, value, gasLimit, useCall, timestamp, confirmCb, gasEstimationForceSend, promptCb, callback) {
    const tx = {
      from: from,
      to: to,
      data: data,
      value: value
    };
    if (!from) return callback('the value of "from" is not defined. Please make sure an account is selected.');
    if (useCall) {
      tx['gas'] = gasLimit;
      if (this._api && this._api.isVM()) tx['timestamp'] = timestamp;
      return this.getWeb3().eth.call(tx, function (error, result) {
        if (error) return callback(error);
        callback(null, {
          result: result
        });
      });
    }
    this.getWeb3().eth.estimateGas(tx, (err, gasEstimation) => {
      if (err && err.message.indexOf('Invalid JSON RPC response') !== -1) {
        // // @todo(#378) this should be removed when https://github.com/WalletConnect/walletconnect-monorepo/issues/334 is fixed
        callback(new Error('Gas estimation failed because of an unknown internal error. This may indicated that the transaction will fail.'));
      }
      this._api.detectNetwork((errNetWork, network) => {
        if (errNetWork) {
          console.log(errNetWork);
          return;
        }
        err = network.name === 'VM' ? null : err; // just send the tx if "VM"
        gasEstimationForceSend(err, () => {
          // callback is called whenever no error
          tx['gas'] = !gasEstimation ? gasLimit : gasEstimation;
          if (this._api.config.getUnpersistedProperty('doNotShowTransactionConfirmationAgain')) {
            return this._executeTx(tx, network, null, this._api, promptCb, callback);
          }
          confirmCb(network, tx, tx['gas'], txFee => {
            return this._executeTx(tx, network, txFee, this._api, promptCb, callback);
          }, error => {
            callback(error);
          });
        }, () => {
          const blockGasLimit = this.currentblockGasLimit();
          // NOTE: estimateGas very likely will return a large limit if execution of the code failed
          //       we want to be able to run the code in order to debug and find the cause for the failure
          if (err) return callback(err);
          let warnEstimation = ' An important gas estimation might also be the sign of a problem in the contract code. Please check loops and be sure you did not sent value to a non payable function (that\'s also the reason of strong gas estimation). ';
          warnEstimation += ' ' + err;
          if (gasEstimation > gasLimit) {
            return callback('Gas required exceeds limit: ' + gasLimit + '. ' + warnEstimation);
          }
          if (gasEstimation > blockGasLimit) {
            return callback('Gas required exceeds block gas limit: ' + gasLimit + '. ' + warnEstimation);
          }
        });
      });
    });
  }
}
exports.TxRunnerWeb3 = TxRunnerWeb3;
function tryTillReceiptAvailable(txhash, web3) {
  return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
    try {
      const receipt = yield web3.eth.getTransactionReceipt(txhash);
      if (receipt) return receipt;
    } catch (e) {}
    yield pause();
    return yield tryTillReceiptAvailable(txhash, web3);
  });
}
function tryTillTxAvailable(txhash, web3) {
  return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
    try {
      const tx = yield web3.eth.getTransaction(txhash);
      if (tx && tx.blockHash) return tx;
    } catch (e) {}
    return yield tryTillTxAvailable(txhash, web3);
  });
}
function pause() {
  return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 500);
    });
  });
}

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/execution/typeConversion.js":
/*!***************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/execution/typeConversion.js ***!
  \***************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.stringify = exports.toInt = void 0;
const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");
function toInt(h) {
  if (h.indexOf && h.indexOf('0x') === 0) {
    return new ethereumjs_util_1.BN(h.replace('0x', ''), 16).toString(10);
  } else if (h.constructor && h.constructor.name === 'BigNumber' || ethereumjs_util_1.BN.isBN(h)) {
    return h.toString(10);
  }
  return h;
}
exports.toInt = toInt;
exports.stringify = convertToString;
function convertToString(v) {
  try {
    if (v instanceof Array) {
      const ret = [];
      for (const k in v) {
        ret.push(convertToString(v[k]));
      }
      return ret;
    } else if (ethereumjs_util_1.BN.isBN(v) || v.constructor && v.constructor.name === 'BigNumber') {
      return v.toString(10);
    } else if (v._isBuffer) {
      return (0, ethereumjs_util_1.bufferToHex)(v);
    } else if (typeof v === 'object') {
      const retObject = {};
      for (const i in v) {
        retObject[i] = convertToString(v[i]);
      }
      return retObject;
    } else {
      return v;
    }
  } catch (e) {
    console.log(e);
    return v;
  }
}

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/helpers/compilerHelper.js":
/*!*************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/helpers/compilerHelper.js ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compilerInput = void 0;
function compilerInput(contracts) {
  return JSON.stringify({
    language: 'Solidity',
    sources: {
      'test.sol': {
        content: contracts
      }
    },
    settings: {
      optimizer: {
        enabled: false,
        runs: 200
      },
      outputSelection: {
        '*': {
          '': ['ast'],
          '*': ['abi', 'metadata', 'evm.legacyAssembly', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'evm.gasEstimates']
        }
      }
    }
  });
}
exports.compilerInput = compilerInput;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/helpers/hhconsoleSigs.js":
/*!************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/helpers/hhconsoleSigs.js ***!
  \************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// Fetched from https://github.com/nomiclabs/hardhat/blob/ee4969a0a8f746f4775d4018326056d161066869/packages/hardhat-core/src/internal/hardhat-network/stack-traces/logger.ts#L47
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ConsoleLogs = void 0;
exports.ConsoleLogs = {
  // Legacy method signatures before this PR: https://github.com/NomicFoundation/hardhat/pull/2964
  1368866505: '()',
  1309416733: '(int)',
  4122065833: '(uint)',
  1093685164: '(string)',
  843419373: '(bool)',
  741264322: '(address)',
  199720790: '(bytes)',
  1847107880: '(bytes1)',
  3921027734: '(bytes2)',
  763578662: '(bytes3)',
  3764340945: '(bytes4)',
  2793701517: '(bytes5)',
  2927928721: '(bytes6)',
  1322614312: '(bytes7)',
  1334060334: '(bytes8)',
  2428341456: '(bytes9)',
  20780939: '(bytes10)',
  67127854: '(bytes11)',
  2258660029: '(bytes12)',
  2488442420: '(bytes13)',
  2456219775: '(bytes14)',
  3667227872: '(bytes15)',
  1717330180: '(bytes16)',
  866084666: '(bytes17)',
  3302112666: '(bytes18)',
  1584093747: '(bytes19)',
  1367925737: '(bytes20)',
  3923391840: '(bytes21)',
  3589990556: '(bytes22)',
  2879508237: '(bytes23)',
  4055063348: '(bytes24)',
  193248344: '(bytes25)',
  4172368369: '(bytes26)',
  976705501: '(bytes27)',
  3358255854: '(bytes28)',
  1265222613: '(bytes29)',
  3994207469: '(bytes30)',
  3263516050: '(bytes31)',
  666357637: '(bytes32)',
  1812949376: '(uint,uint)',
  262402885: '(uint,string)',
  510514412: '(uint,bool)',
  1491830284: '(uint,address)',
  2534451664: '(string,uint)',
  1264337527: '(string,string)',
  3283441205: '(string,bool)',
  832238387: '(string,address)',
  910912146: '(bool,uint)',
  2414527781: '(bool,string)',
  705760899: '(bool,bool)',
  2235320393: '(bool,address)',
  574869411: '(address,uint)',
  1973388987: '(address,string)',
  1974863315: '(address,bool)',
  3673216170: '(address,address)',
  3884059252: '(uint,uint,uint)',
  2104037094: '(uint,uint,string)',
  1733758967: '(uint,uint,bool)',
  3191032091: '(uint,uint,address)',
  1533929535: '(uint,string,uint)',
  1062716053: '(uint,string,string)',
  1185403086: '(uint,string,bool)',
  529592906: '(uint,string,address)',
  1515034914: '(uint,bool,uint)',
  2332955902: '(uint,bool,string)',
  3587091680: '(uint,bool,bool)',
  1112473535: '(uint,bool,address)',
  2286109610: '(uint,address,uint)',
  3464692859: '(uint,address,string)',
  2060456590: '(uint,address,bool)',
  2104993307: '(uint,address,address)',
  2526862595: '(string,uint,uint)',
  2750793529: '(string,uint,string)',
  4043501061: '(string,uint,bool)',
  3817119609: '(string,uint,address)',
  4083337817: '(string,string,uint)',
  753761519: '(string,string,string)',
  2967534005: '(string,string,bool)',
  2515337621: '(string,string,address)',
  689682896: '(string,bool,uint)',
  3801674877: '(string,bool,string)',
  2232122070: '(string,bool,bool)',
  2469116728: '(string,bool,address)',
  130552343: '(string,address,uint)',
  3773410639: '(string,address,string)',
  3374145236: '(string,address,bool)',
  4243355104: '(string,address,address)',
  995886048: '(bool,uint,uint)',
  3359211184: '(bool,uint,string)',
  464374251: '(bool,uint,bool)',
  3302110471: '(bool,uint,address)',
  3224906412: '(bool,string,uint)',
  2960557183: '(bool,string,string)',
  3686056519: '(bool,string,bool)',
  2509355347: '(bool,string,address)',
  2954061243: '(bool,bool,uint)',
  626391622: '(bool,bool,string)',
  1349555864: '(bool,bool,bool)',
  276362893: '(bool,bool,address)',
  3950005167: '(bool,address,uint)',
  3734671984: '(bool,address,string)',
  415876934: '(bool,address,bool)',
  3530962535: '(bool,address,address)',
  2273710942: '(address,uint,uint)',
  3136907337: '(address,uint,string)',
  3846889796: '(address,uint,bool)',
  2548867988: '(address,uint,address)',
  484110986: '(address,string,uint)',
  4218888805: '(address,string,string)',
  3473018801: '(address,string,bool)',
  4035396840: '(address,string,address)',
  742821141: '(address,bool,uint)',
  555898316: '(address,bool,string)',
  3951234194: '(address,bool,bool)',
  4044790253: '(address,bool,address)',
  1815506290: '(address,address,uint)',
  7426238: '(address,address,string)',
  4070990470: '(address,address,bool)',
  25986242: '(address,address,address)',
  1554033982: '(uint,uint,uint,uint)',
  2024634892: '(uint,uint,uint,string)',
  1683143115: '(uint,uint,uint,bool)',
  3766828905: '(uint,uint,uint,address)',
  949229117: '(uint,uint,string,uint)',
  2080582194: '(uint,uint,string,string)',
  2989403910: '(uint,uint,string,bool)',
  1127384482: '(uint,uint,string,address)',
  1818524812: '(uint,uint,bool,uint)',
  4024028142: '(uint,uint,bool,string)',
  2495495089: '(uint,uint,bool,bool)',
  3776410703: '(uint,uint,bool,address)',
  1628154048: '(uint,uint,address,uint)',
  3600994782: '(uint,uint,address,string)',
  2833785006: '(uint,uint,address,bool)',
  3398671136: '(uint,uint,address,address)',
  3221501959: '(uint,string,uint,uint)',
  2730232985: '(uint,string,uint,string)',
  2270850606: '(uint,string,uint,bool)',
  2877020669: '(uint,string,uint,address)',
  1995203422: '(uint,string,string,uint)',
  1474103825: '(uint,string,string,string)',
  310782872: '(uint,string,string,bool)',
  3432549024: '(uint,string,string,address)',
  2763295359: '(uint,string,bool,uint)',
  2370346144: '(uint,string,bool,string)',
  1371286465: '(uint,string,bool,bool)',
  2037328032: '(uint,string,bool,address)',
  2565338099: '(uint,string,address,uint)',
  4170733439: '(uint,string,address,string)',
  4181720887: '(uint,string,address,bool)',
  2141537675: '(uint,string,address,address)',
  1451396516: '(uint,bool,uint,uint)',
  3906845782: '(uint,bool,uint,string)',
  3534472445: '(uint,bool,uint,bool)',
  1329595790: '(uint,bool,uint,address)',
  2438978344: '(uint,bool,string,uint)',
  2754870525: '(uint,bool,string,string)',
  879671495: '(uint,bool,string,bool)',
  1231956916: '(uint,bool,string,address)',
  3173363033: '(uint,bool,bool,uint)',
  831186331: '(uint,bool,bool,string)',
  1315722005: '(uint,bool,bool,bool)',
  1392910941: '(uint,bool,bool,address)',
  1102442299: '(uint,bool,address,uint)',
  2721084958: '(uint,bool,address,string)',
  2449150530: '(uint,bool,address,bool)',
  2263728396: '(uint,bool,address,address)',
  3399106228: '(uint,address,uint,uint)',
  1054063912: '(uint,address,uint,string)',
  435581801: '(uint,address,uint,bool)',
  4256361684: '(uint,address,uint,address)',
  2697204968: '(uint,address,string,uint)',
  2373420580: '(uint,address,string,string)',
  581204390: '(uint,address,string,bool)',
  3420819197: '(uint,address,string,address)',
  2064181483: '(uint,address,bool,uint)',
  1676730946: '(uint,address,bool,string)',
  2116501773: '(uint,address,bool,bool)',
  3056677012: '(uint,address,bool,address)',
  2587672470: '(uint,address,address,uint)',
  2034490470: '(uint,address,address,string)',
  22350596: '(uint,address,address,bool)',
  1430734329: '(uint,address,address,address)',
  149837414: '(string,uint,uint,uint)',
  2773406909: '(string,uint,uint,string)',
  4147936829: '(string,uint,uint,bool)',
  3201771711: '(string,uint,uint,address)',
  2697245221: '(string,uint,string,uint)',
  1821956834: '(string,uint,string,string)',
  3919545039: '(string,uint,string,bool)',
  3144824297: '(string,uint,string,address)',
  1427009269: '(string,uint,bool,uint)',
  1993105508: '(string,uint,bool,string)',
  3816813520: '(string,uint,bool,bool)',
  3847527825: '(string,uint,bool,address)',
  1481210622: '(string,uint,address,uint)',
  844415720: '(string,uint,address,string)',
  285649143: '(string,uint,address,bool)',
  3939013249: '(string,uint,address,address)',
  3587119056: '(string,string,uint,uint)',
  2366909661: '(string,string,uint,string)',
  3864418506: '(string,string,uint,bool)',
  1565476480: '(string,string,uint,address)',
  2681211381: '(string,string,string,uint)',
  3731419658: '(string,string,string,string)',
  739726573: '(string,string,string,bool)',
  1834430276: '(string,string,string,address)',
  2256636538: '(string,string,bool,uint)',
  1585754346: '(string,string,bool,string)',
  1081628777: '(string,string,bool,bool)',
  3279013851: '(string,string,bool,address)',
  1250010474: '(string,string,address,uint)',
  3944480640: '(string,string,address,string)',
  1556958775: '(string,string,address,bool)',
  1134328815: '(string,string,address,address)',
  1572859960: '(string,bool,uint,uint)',
  1119461927: '(string,bool,uint,string)',
  1019590099: '(string,bool,uint,bool)',
  1909687565: '(string,bool,uint,address)',
  885731469: '(string,bool,string,uint)',
  2821114603: '(string,bool,string,string)',
  1066037277: '(string,bool,string,bool)',
  3764542249: '(string,bool,string,address)',
  2155164136: '(string,bool,bool,uint)',
  2636305885: '(string,bool,bool,string)',
  2304440517: '(string,bool,bool,bool)',
  1905304873: '(string,bool,bool,address)',
  685723286: '(string,bool,address,uint)',
  764294052: '(string,bool,address,string)',
  2508990662: '(string,bool,address,bool)',
  870964509: '(string,bool,address,address)',
  3668153533: '(string,address,uint,uint)',
  1280700980: '(string,address,uint,string)',
  1522647356: '(string,address,uint,bool)',
  2741431424: '(string,address,uint,address)',
  2405583849: '(string,address,string,uint)',
  609847026: '(string,address,string,string)',
  1595265676: '(string,address,string,bool)',
  2864486961: '(string,address,string,address)',
  3318856587: '(string,address,bool,uint)',
  72663161: '(string,address,bool,string)',
  2038975531: '(string,address,bool,bool)',
  573965245: '(string,address,bool,address)',
  1857524797: '(string,address,address,uint)',
  2148146279: '(string,address,address,string)',
  3047013728: '(string,address,address,bool)',
  3985582326: '(string,address,address,address)',
  853517604: '(bool,uint,uint,uint)',
  3657852616: '(bool,uint,uint,string)',
  2753397214: '(bool,uint,uint,bool)',
  4049711649: '(bool,uint,uint,address)',
  1098907931: '(bool,uint,string,uint)',
  3542771016: '(bool,uint,string,string)',
  2446522387: '(bool,uint,string,bool)',
  2781285673: '(bool,uint,string,address)',
  3554563475: '(bool,uint,bool,uint)',
  3067439572: '(bool,uint,bool,string)',
  2650928961: '(bool,uint,bool,bool)',
  1114097656: '(bool,uint,bool,address)',
  3399820138: '(bool,uint,address,uint)',
  403247937: '(bool,uint,address,string)',
  1705899016: '(bool,uint,address,bool)',
  2318373034: '(bool,uint,address,address)',
  2387273838: '(bool,string,uint,uint)',
  2007084013: '(bool,string,uint,string)',
  549177775: '(bool,string,uint,bool)',
  1529002296: '(bool,string,uint,address)',
  1574643090: '(bool,string,string,uint)',
  392356650: '(bool,string,string,string)',
  508266469: '(bool,string,string,bool)',
  2547225816: '(bool,string,string,address)',
  2372902053: '(bool,string,bool,uint)',
  1211958294: '(bool,string,bool,string)',
  3697185627: '(bool,string,bool,bool)',
  1401816747: '(bool,string,bool,address)',
  453743963: '(bool,string,address,uint)',
  316065672: '(bool,string,address,string)',
  1842623690: '(bool,string,address,bool)',
  724244700: '(bool,string,address,address)',
  1181212302: '(bool,bool,uint,uint)',
  1348569399: '(bool,bool,uint,string)',
  2874982852: '(bool,bool,uint,bool)',
  201299213: '(bool,bool,uint,address)',
  395003525: '(bool,bool,string,uint)',
  1830717265: '(bool,bool,string,string)',
  3092715066: '(bool,bool,string,bool)',
  4188875657: '(bool,bool,string,address)',
  3259532109: '(bool,bool,bool,uint)',
  719587540: '(bool,bool,bool,string)',
  992632032: '(bool,bool,bool,bool)',
  2352126746: '(bool,bool,bool,address)',
  1620281063: '(bool,bool,address,uint)',
  2695133539: '(bool,bool,address,string)',
  3231908568: '(bool,bool,address,bool)',
  4102557348: '(bool,bool,address,address)',
  2617143996: '(bool,address,uint,uint)',
  2691192883: '(bool,address,uint,string)',
  4002252402: '(bool,address,uint,bool)',
  1760647349: '(bool,address,uint,address)',
  194640930: '(bool,address,string,uint)',
  2805734838: '(bool,address,string,string)',
  3804222987: '(bool,address,string,bool)',
  1870422078: '(bool,address,string,address)',
  1287000017: '(bool,address,bool,uint)',
  1248250676: '(bool,address,bool,string)',
  1788626827: '(bool,address,bool,bool)',
  474063670: '(bool,address,bool,address)',
  1384430956: '(bool,address,address,uint)',
  3625099623: '(bool,address,address,string)',
  1180699616: '(bool,address,address,bool)',
  487903233: '(bool,address,address,address)',
  1024368100: '(address,uint,uint,uint)',
  2301889963: '(address,uint,uint,string)',
  3964381346: '(address,uint,uint,bool)',
  519451700: '(address,uint,uint,address)',
  4111650715: '(address,uint,string,uint)',
  2119616147: '(address,uint,string,string)',
  2751614737: '(address,uint,string,bool)',
  3698927108: '(address,uint,string,address)',
  1770996626: '(address,uint,bool,uint)',
  2391690869: '(address,uint,bool,string)',
  4272018778: '(address,uint,bool,bool)',
  602229106: '(address,uint,bool,address)',
  2782496616: '(address,uint,address,uint)',
  1567749022: '(address,uint,address,string)',
  4051804649: '(address,uint,address,bool)',
  3961816175: '(address,uint,address,address)',
  2764647008: '(address,string,uint,uint)',
  1561552329: '(address,string,uint,string)',
  2116357467: '(address,string,uint,bool)',
  3755464715: '(address,string,uint,address)',
  2706362425: '(address,string,string,uint)',
  1560462603: '(address,string,string,string)',
  900007711: '(address,string,string,bool)',
  2689478535: '(address,string,string,address)',
  3877655068: '(address,string,bool,uint)',
  3154862590: '(address,string,bool,string)',
  1595759775: '(address,string,bool,bool)',
  542667202: '(address,string,bool,address)',
  2350461865: '(address,string,address,uint)',
  4158874181: '(address,string,address,string)',
  233909110: '(address,string,address,bool)',
  221706784: '(address,string,address,address)',
  3255869470: '(address,bool,uint,uint)',
  2606272204: '(address,bool,uint,string)',
  2244855215: '(address,bool,uint,bool)',
  227337758: '(address,bool,uint,address)',
  2652011374: '(address,bool,string,uint)',
  1197235251: '(address,bool,string,string)',
  1353532957: '(address,bool,string,bool)',
  436029782: '(address,bool,string,address)',
  3484780374: '(address,bool,bool,uint)',
  3754205928: '(address,bool,bool,string)',
  3401856121: '(address,bool,bool,bool)',
  3476636805: '(address,bool,bool,address)',
  3698398930: '(address,bool,address,uint)',
  769095910: '(address,bool,address,string)',
  2801077007: '(address,bool,address,bool)',
  1711502813: '(address,bool,address,address)',
  1425929188: '(address,address,uint,uint)',
  2647731885: '(address,address,uint,string)',
  3270936812: '(address,address,uint,bool)',
  3603321462: '(address,address,uint,address)',
  69767936: '(address,address,string,uint)',
  566079269: '(address,address,string,string)',
  1863997774: '(address,address,string,bool)',
  2406706454: '(address,address,string,address)',
  2513854225: '(address,address,bool,uint)',
  2858762440: '(address,address,bool,string)',
  752096074: '(address,address,bool,bool)',
  2669396846: '(address,address,bool,address)',
  3982404743: '(address,address,address,uint)',
  4161329696: '(address,address,address,string)',
  238520724: '(address,address,address,bool)',
  1717301556: '(address,address,address,address)',
  4133908826: '(uint,uint)',
  3054400204: '(string,uint)',
  // Latest method signatures after updating uint to uint256 and int to int256
  760966329: '(int256)',
  4163653873: '(uint256)',
  1681903839: '(uint256, string)',
  480083635: '(uint256, bool)',
  1764191366: '(uint256, address)',
  965833939: '(bool, uint256)',
  2198464680: '(address, uint256)',
  3522001468: '(uint256, uint256, uint256)',
  1909476082: '(uint256, uint256, string)',
  1197922930: '(uint256, uint256, bool)',
  1553380145: '(uint256, uint256, address)',
  933920076: '(uint256, string, uint256)',
  2970968351: '(uint256, string, string)',
  1290643290: '(uint256, string, bool)',
  2063255897: '(uint256, string, address)',
  537493524: '(uint256, bool, uint256)',
  2239189025: '(uint256, bool, string)',
  544310864: '(uint256, bool, bool)',
  889741179: '(uint256, bool, address)',
  1520131797: '(uint256, address, uint256)',
  1674265081: '(uint256, address, string)',
  2607726658: '(uint256, address, bool)',
  3170737120: '(uint256, address, address)',
  3393701099: '(string, uint256, uint256)',
  1500569737: '(string, uint256, string)',
  3396809649: '(string, uint256, bool)',
  478069832: '(string, uint256, address)',
  1478619041: '(string, string, uint256)',
  3378075862: '(string, bool, uint256)',
  220641573: '(string, address, uint256)',
  923808615: '(bool, uint256, uint256)',
  3288086896: '(bool, uint256, string)',
  3906927529: '(bool, uint256, bool)',
  143587794: '(bool, uint256, address)',
  278130193: '(bool, string, uint256)',
  317855234: '(bool, bool, uint256)',
  1601936123: '(bool, address, uint256)',
  3063663350: '(address, uint256, uint256)',
  2717051050: '(address, uint256, string)',
  1736575400: '(address, uint256, bool)',
  2076235848: '(address, uint256, address)',
  1742565361: '(address, string, uint256)',
  2622462459: '(address, bool, uint256)',
  402547077: '(address, address, uint256)',
  423606272: '(uint256, uint256, uint256, uint256)',
  1506790371: '(uint256, uint256, uint256, string)',
  4202792367: '(uint256, uint256, uint256, address)',
  1570936811: '(uint256, uint256, string, uint256)',
  668512210: '(uint256, uint256, string, string)',
  2062986021: '(uint256, uint256, string, bool)',
  1121066423: '(uint256, uint256, string, address)',
  3950997458: '(uint256, uint256, bool, uint256)',
  2780101785: '(uint256, uint256, bool, string)',
  2869451494: '(uint256, uint256, bool, bool)',
  2592172675: '(uint256, uint256, bool, address)',
  2297881778: '(uint256, uint256, address, uint256)',
  1826504888: '(uint256, uint256, address, string)',
  365610102: '(uint256, uint256, address, bool)',
  1453707697: '(uint256, uint256, address, address)',
  2193775476: '(uint256, string, uint256, uint256)',
  3082360010: '(uint256, string, uint256, string)',
  1763348340: '(uint256, string, uint256, bool)',
  992115124: '(uint256, string, uint256, address)',
  2955463101: '(uint256, string, string, uint256)',
  564987523: '(uint256, string, string, string)',
  3014047421: '(uint256, string, string, bool)',
  3582182914: '(uint256, string, string, address)',
  3472922752: '(uint256, string, bool, uint256)',
  3537118157: '(uint256, string, bool, string)',
  3126025628: '(uint256, string, bool, bool)',
  2922300801: '(uint256, string, bool, address)',
  3906142605: '(uint256, string, address, uint256)',
  2621104033: '(uint256, string, address, string)',
  2428701270: '(uint256, string, address, bool)',
  1634266465: '(uint256, string, address, address)',
  3333212072: '(uint256, bool, uint256, uint256)',
  3724797812: '(uint256, bool, uint256, string)',
  2443193898: '(uint256, bool, uint256, bool)',
  2295029825: '(uint256, bool, uint256, address)',
  740099910: '(uint256, bool, string, uint256)',
  1757984957: '(uint256, bool, string, string)',
  3952250239: '(uint256, bool, string, bool)',
  4015165464: '(uint256, bool, string, address)',
  1952763427: '(uint256, bool, bool, uint256)',
  3722155361: '(uint256, bool, bool, string)',
  3069540257: '(uint256, bool, bool, bool)',
  1768164185: '(uint256, bool, bool, address)',
  125994997: '(uint256, bool, address, uint256)',
  2917159623: '(uint256, bool, address, string)',
  1162695845: '(uint256, bool, address, bool)',
  2716814523: '(uint256, bool, address, address)',
  211605953: '(uint256, address, uint256, uint256)',
  3719324961: '(uint256, address, uint256, string)',
  1601452668: '(uint256, address, uint256, bool)',
  364980149: '(uint256, address, uint256, address)',
  1182952285: '(uint256, address, string, uint256)',
  1041403043: '(uint256, address, string, string)',
  3425872647: '(uint256, address, string, bool)',
  2629472255: '(uint256, address, string, address)',
  1522374954: '(uint256, address, bool, uint256)',
  2432370346: '(uint256, address, bool, string)',
  3813741583: '(uint256, address, bool, bool)',
  4017276179: '(uint256, address, bool, address)',
  1936653238: '(uint256, address, address, uint256)',
  52195187: '(uint256, address, address, string)',
  153090805: '(uint256, address, address, bool)',
  612938772: '(uint256, address, address, address)',
  2812835923: '(string, uint256, uint256, uint256)',
  2236298390: '(string, uint256, uint256, string)',
  1982258066: '(string, uint256, uint256, bool)',
  3793609336: '(string, uint256, uint256, address)',
  3330189777: '(string, uint256, string, uint256)',
  1522028063: '(string, uint256, string, string)',
  2099530013: '(string, uint256, string, bool)',
  2084975268: '(string, uint256, string, address)',
  3827003247: '(string, uint256, bool, uint256)',
  2885106328: '(string, uint256, bool, string)',
  894187222: '(string, uint256, bool, bool)',
  3773389720: '(string, uint256, bool, address)',
  1325727174: '(string, uint256, address, uint256)',
  2684039059: '(string, uint256, address, string)',
  2182163010: '(string, uint256, address, bool)',
  1587722158: '(string, uint256, address, address)',
  4099767596: '(string, string, uint256, uint256)',
  1562023706: '(string, string, uint256, string)',
  3282609748: '(string, string, uint256, bool)',
  270792626: '(string, string, uint256, address)',
  2393878571: '(string, string, string, uint256)',
  3601791698: '(string, string, bool, uint256)',
  2093204999: '(string, string, address, uint256)',
  1689631591: '(string, bool, uint256, uint256)',
  1949134567: '(string, bool, uint256, string)',
  2331496330: '(string, bool, uint256, bool)',
  2472413631: '(string, bool, uint256, address)',
  620303461: '(string, bool, string, uint256)',
  2386524329: '(string, bool, bool, uint256)',
  1560853253: '(string, bool, address, uint256)',
  4176812830: '(string, address, uint256, uint256)',
  1514632754: '(string, address, uint256, string)',
  4232594928: '(string, address, uint256, bool)',
  1677429701: '(string, address, uint256, address)',
  2446397742: '(string, address, string, uint256)',
  1050642026: '(string, address, bool, uint256)',
  2398352281: '(string, address, address, uint256)',
  927708338: '(bool, uint256, uint256, uint256)',
  2389310301: '(bool, uint256, uint256, string)',
  3197649747: '(bool, uint256, uint256, bool)',
  14518201: '(bool, uint256, uint256, address)',
  1779538402: '(bool, uint256, string, uint256)',
  4122747465: '(bool, uint256, string, string)',
  3857124139: '(bool, uint256, string, bool)',
  4275904511: '(bool, uint256, string, address)',
  2437143473: '(bool, uint256, bool, string)',
  3468031191: '(bool, uint256, bool, bool)',
  2597139990: '(bool, uint256, bool, address)',
  355982471: '(bool, uint256, address, uint256)',
  464760986: '(bool, uint256, address, string)',
  3032683775: '(bool, uint256, address, bool)',
  653615272: '(bool, uint256, address, address)',
  679886795: '(bool, string, uint256, uint256)',
  450457062: '(bool, string, uint256, string)',
  1796103507: '(bool, string, uint256, bool)',
  362193358: '(bool, string, uint256, address)',
  2078327787: '(bool, string, string, uint256)',
  369533843: '(bool, string, bool, uint256)',
  196087467: '(bool, bool, uint256, uint256)',
  2111099104: '(bool, bool, uint256, string)',
  1637764366: '(bool, bool, uint256, bool)',
  1420274080: '(bool, bool, uint256, address)',
  3819555375: '(bool, bool, string, uint256)',
  1836074433: '(bool, bool, bool, uint256)',
  1276263767: '(bool, bool, address, uint256)',
  2079424929: '(bool, address, uint256, uint256)',
  1374724088: '(bool, address, uint256, string)',
  3590430492: '(bool, address, uint256, bool)',
  325780957: '(bool, address, uint256, address)',
  3256837319: '(bool, address, string, uint256)',
  126031106: '(bool, address, bool, uint256)',
  208064958: '(bool, address, address, uint256)',
  888202806: '(address, uint256, uint256, uint256)',
  1244184599: '(address, uint256, uint256, string)',
  1727118439: '(address, uint256, uint256, bool)',
  551786573: '(address, uint256, uint256, address)',
  3204577425: '(address, uint256, string, uint256)',
  2292761606: '(address, uint256, string, string)',
  3474460764: '(address, uint256, string, bool)',
  1547898183: '(address, uint256, string, address)',
  586594713: '(address, uint256, bool, uint256)',
  3316483577: '(address, uint256, bool, string)',
  1005970743: '(address, uint256, bool, bool)',
  2736520652: '(address, uint256, bool, address)',
  269444366: '(address, uint256, address, uint256)',
  497649386: '(address, uint256, address, string)',
  2713504179: '(address, uint256, address, bool)',
  1200430178: '(address, uint256, address, address)',
  499704248: '(address, string, uint256, uint256)',
  1149776040: '(address, string, uint256, string)',
  251125840: '(address, string, uint256, bool)',
  1662531192: '(address, string, uint256, address)',
  362776871: '(address, string, string, uint256)',
  1365129398: '(address, string, bool, uint256)',
  1166009295: '(address, string, address, uint256)',
  946861556: '(address, bool, uint256, uint256)',
  178704301: '(address, bool, uint256, string)',
  3294903840: '(address, bool, uint256, bool)',
  3438776481: '(address, bool, uint256, address)',
  2162598411: '(address, bool, string, uint256)',
  2353946086: '(address, bool, bool, uint256)',
  2807847390: '(address, bool, address, uint256)',
  3193255041: '(address, address, uint256, uint256)',
  4256496016: '(address, address, uint256, string)',
  2604815586: '(address, address, uint256, bool)',
  2376523509: '(address, address, uint256, address)',
  4011651047: '(address, address, string, uint256)',
  963766156: '(address, address, bool, uint256)',
  2485456247: '(address, address, address, uint256)'
};

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/helpers/txResultHelper.js":
/*!*************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/helpers/txResultHelper.js ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resultToRemixTx = void 0;
const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");
const ethjs_util_1 = __webpack_require__(/*! ethjs-util */ "../../../node_modules/ethjs-util/lib/index.js");
function convertToPrefixedHex(input) {
  if (input === undefined || input === null || (0, ethjs_util_1.isHexString)(input)) {
    return input;
  } else if (Buffer.isBuffer(input)) {
    return (0, ethereumjs_util_1.bufferToHex)(input);
  }
  return '0x' + input.toString(16);
}
/*
 txResult.result can be 3 different things:
 - VM call or tx: ethereumjs-vm result object
 - Node transaction: object returned from eth.getTransactionReceipt()
 - Node call: return value from function call (not an object)

 Also, VM results use BN and Buffers, Node results use hex strings/ints,
 So we need to normalize the values to prefixed hex strings
*/
function resultToRemixTx(txResult, execResult) {
  const {
    receipt,
    transactionHash,
    result
  } = txResult;
  const {
    status,
    gasUsed,
    contractAddress
  } = receipt;
  let returnValue, errorMessage;
  if ((0, ethjs_util_1.isHexString)(result)) {
    returnValue = result;
  } else if (execResult !== undefined) {
    returnValue = execResult.returnValue;
    errorMessage = execResult.exceptionError;
  }
  return {
    transactionHash,
    status,
    gasUsed: convertToPrefixedHex(gasUsed),
    error: errorMessage,
    return: convertToPrefixedHex(returnValue),
    createdAddress: convertToPrefixedHex(contractAddress)
  };
}
exports.resultToRemixTx = resultToRemixTx;
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../../node_modules/node-libs-browser/node_modules/buffer/index.js */ "../../../node_modules/node-libs-browser/node_modules/buffer/index.js").Buffer))

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/helpers/uiHelper.js":
/*!*******************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/helpers/uiHelper.js ***!
  \*******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runInBrowser = exports.normalizeHexAddress = exports.normalizeHex = exports.formatCss = exports.tryConvertAsciiFormat = exports.formatMemory = void 0;
function formatMemory(mem, width) {
  const ret = {};
  if (!mem) {
    return ret;
  }
  if (!mem.substr) {
    mem = mem.join(''); // geth returns an array, eth return raw string
  }

  for (let k = 0; k < mem.length; k += width * 2) {
    const memory = mem.substr(k, width * 2);
    const content = tryConvertAsciiFormat(memory);
    ret['0x' + (k / 2).toString(16)] = content.raw + '\t' + content.ascii;
  }
  return ret;
}
exports.formatMemory = formatMemory;
function tryConvertAsciiFormat(memorySlot) {
  const ret = {
    ascii: '',
    raw: ''
  };
  for (let k = 0; k < memorySlot.length; k += 2) {
    const raw = memorySlot.substr(k, 2);
    let ascii = String.fromCharCode(parseInt(raw, 16));
    ascii = ascii.replace(/[^\w\s]/, '?');
    if (ascii === '') {
      ascii = '?';
    }
    ret.ascii += ascii;
    ret.raw += raw;
  }
  return ret;
}
exports.tryConvertAsciiFormat = tryConvertAsciiFormat;
/**
 * format @args css1, css2, css3 to css inline style
 *
 * @param {Object} css1 - css inline declaration
 * @param {Object} css2 - css inline declaration
 * @param {Object} css3 - css inline declaration
 * @param {Object} ...
 * @return {String} css inline style
 *                  if the key start with * the value is direcly appended to the inline style (which should be already inline style formatted)
 *                  used if multiple occurences of the same key is needed
 */
function formatCss(css1, css2) {
  let ret = '';
  for (const arg in arguments) {
    // eslint-disable-line
    for (const k in arguments[arg]) {
      // eslint-disable-line
      if (arguments[arg][k] && ret.indexOf(k) === -1) {
        // eslint-disable-line
        if (k.indexOf('*') === 0) {
          ret += arguments[arg][k]; // eslint-disable-line
        } else {
          ret += k + ':' + arguments[arg][k] + ';'; // eslint-disable-line
        }
      }
    }
  }

  return ret;
}
exports.formatCss = formatCss;
function normalizeHex(hex) {
  if (hex.indexOf('0x') === 0) {
    hex = hex.replace('0x', '');
  }
  hex = hex.replace(/^0+/, '');
  return '0x' + hex;
}
exports.normalizeHex = normalizeHex;
function normalizeHexAddress(hex) {
  if (hex.indexOf('0x') === 0) hex = hex.replace('0x', '');
  if (hex.length >= 40) {
    const reg = /(.{40})$/.exec(hex);
    if (reg) {
      return '0x' + reg[0];
    }
  } else {
    return '0x' + new Array(40 - hex.length + 1).join('0') + hex;
  }
}
exports.normalizeHexAddress = normalizeHexAddress;
function runInBrowser() {
  return typeof window !== 'undefined';
}
exports.runInBrowser = runInBrowser;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/index.js":
/*!********************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/index.js ***!
  \********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.execution = exports.util = exports.Storage = exports.helpers = exports.EventManager = exports.QueryParams = exports.ConsoleLogs = void 0;
const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");
const eventManager_1 = __webpack_require__(/*! ./eventManager */ "../../../dist/libs/remix-lib/src/eventManager.js");
Object.defineProperty(exports, "EventManager", {
  enumerable: true,
  get: function () {
    return eventManager_1.EventManager;
  }
});
const uiHelper = (0, tslib_1.__importStar)(__webpack_require__(/*! ./helpers/uiHelper */ "../../../dist/libs/remix-lib/src/helpers/uiHelper.js"));
const compilerHelper = (0, tslib_1.__importStar)(__webpack_require__(/*! ./helpers/compilerHelper */ "../../../dist/libs/remix-lib/src/helpers/compilerHelper.js"));
const util = (0, tslib_1.__importStar)(__webpack_require__(/*! ./util */ "../../../dist/libs/remix-lib/src/util.js"));
exports.util = util;
const storage_1 = __webpack_require__(/*! ./storage */ "../../../dist/libs/remix-lib/src/storage.js");
Object.defineProperty(exports, "Storage", {
  enumerable: true,
  get: function () {
    return storage_1.Storage;
  }
});
const eventsDecoder_1 = __webpack_require__(/*! ./execution/eventsDecoder */ "../../../dist/libs/remix-lib/src/execution/eventsDecoder.js");
const txExecution = (0, tslib_1.__importStar)(__webpack_require__(/*! ./execution/txExecution */ "../../../dist/libs/remix-lib/src/execution/txExecution.js"));
const txHelper = (0, tslib_1.__importStar)(__webpack_require__(/*! ./execution/txHelper */ "../../../dist/libs/remix-lib/src/execution/txHelper.js"));
const txFormat = (0, tslib_1.__importStar)(__webpack_require__(/*! ./execution/txFormat */ "../../../dist/libs/remix-lib/src/execution/txFormat.js"));
const txListener_1 = __webpack_require__(/*! ./execution/txListener */ "../../../dist/libs/remix-lib/src/execution/txListener.js");
const txRunner_1 = __webpack_require__(/*! ./execution/txRunner */ "../../../dist/libs/remix-lib/src/execution/txRunner.js");
const logsManager_1 = __webpack_require__(/*! ./execution/logsManager */ "../../../dist/libs/remix-lib/src/execution/logsManager.js");
const forkAt_1 = __webpack_require__(/*! ./execution/forkAt */ "../../../dist/libs/remix-lib/src/execution/forkAt.js");
const typeConversion = (0, tslib_1.__importStar)(__webpack_require__(/*! ./execution/typeConversion */ "../../../dist/libs/remix-lib/src/execution/typeConversion.js"));
const txRunnerVM_1 = __webpack_require__(/*! ./execution/txRunnerVM */ "../../../dist/libs/remix-lib/src/execution/txRunnerVM.js");
const txRunnerWeb3_1 = __webpack_require__(/*! ./execution/txRunnerWeb3 */ "../../../dist/libs/remix-lib/src/execution/txRunnerWeb3.js");
const txResultHelper = (0, tslib_1.__importStar)(__webpack_require__(/*! ./helpers/txResultHelper */ "../../../dist/libs/remix-lib/src/helpers/txResultHelper.js"));
var hhconsoleSigs_1 = __webpack_require__(/*! ./helpers/hhconsoleSigs */ "../../../dist/libs/remix-lib/src/helpers/hhconsoleSigs.js");
Object.defineProperty(exports, "ConsoleLogs", {
  enumerable: true,
  get: function () {
    return hhconsoleSigs_1.ConsoleLogs;
  }
});
var query_params_1 = __webpack_require__(/*! ./query-params */ "../../../dist/libs/remix-lib/src/query-params.js");
Object.defineProperty(exports, "QueryParams", {
  enumerable: true,
  get: function () {
    return query_params_1.QueryParams;
  }
});
const helpers = {
  ui: uiHelper,
  compiler: compilerHelper,
  txResultHelper
};
exports.helpers = helpers;
const execution = {
  EventsDecoder: eventsDecoder_1.EventsDecoder,
  txExecution: txExecution,
  txHelper: txHelper,
  txFormat: txFormat,
  txListener: txListener_1.TxListener,
  TxRunner: txRunner_1.TxRunner,
  TxRunnerWeb3: txRunnerWeb3_1.TxRunnerWeb3,
  TxRunnerVM: txRunnerVM_1.TxRunnerVM,
  typeConversion: typeConversion,
  LogsManager: logsManager_1.LogsManager,
  forkAt: forkAt_1.forkAt
};
exports.execution = execution;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/query-params.js":
/*!***************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/query-params.js ***!
  \***************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QueryParams = void 0;
class QueryParams {
  update(params) {
    const currentParams = this.get();
    const keys = Object.keys(params);
    for (const x in keys) {
      currentParams[keys[x]] = params[keys[x]];
    }
    let queryString = '#';
    const updatedKeys = Object.keys(currentParams);
    for (const y in updatedKeys) {
      queryString += updatedKeys[y] + '=' + currentParams[updatedKeys[y]] + '&';
    }
    window.location.hash = queryString.slice(0, -1);
  }
  get() {
    const qs = window.location.hash.substr(1);
    if (window.location.search.length > 0) {
      // use legacy query params instead of hash
      window.location.hash = window.location.search.substr(1);
      window.location.search = '';
    }
    const params = {};
    const parts = qs.split('&');
    for (const x in parts) {
      const keyValue = parts[x].split('=');
      if (keyValue[0] !== '') {
        params[keyValue[0]] = keyValue[1];
      }
    }
    return params;
  }
}
exports.QueryParams = QueryParams;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/storage.js":
/*!**********************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/storage.js ***!
  \**********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Storage = void 0;
class Storage {
  constructor(prefix) {
    this.prefix = prefix;
    // on startup, upgrade the old storage layout
    if (typeof window !== 'undefined') {
      this.safeKeys().forEach(function (name) {
        if (name.indexOf('sol-cache-file-', 0) === 0) {
          const content = window.localStorage.getItem(name);
          window.localStorage.setItem(name.replace(/^sol-cache-file-/, 'sol:'), content);
          window.localStorage.removeItem(name);
        }
      });
    }
    // remove obsolete key
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('editor-size-cache');
    }
  }
  exists(name) {
    if (typeof window !== 'undefined') {
      return this.get(name) !== null;
    }
  }
  get(name) {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(this.prefix + name);
    }
  }
  set(name, content) {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(this.prefix + name, content);
      }
    } catch (exception) {
      return false;
    }
    return true;
  }
  remove(name) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.prefix + name);
    }
    return true;
  }
  rename(originalName, newName) {
    const content = this.get(originalName);
    if (!this.set(newName, content)) {
      return false;
    }
    this.remove(originalName);
    return true;
  }
  safeKeys() {
    // NOTE: this is a workaround for some browsers
    if (typeof window !== 'undefined') {
      return Object.keys(window.localStorage).filter(function (item) {
        return item !== null && item !== undefined;
      });
    }
    return [];
  }
  keys() {
    return this.safeKeys()
    // filter any names not including the prefix
    .filter(item => item.indexOf(this.prefix, 0) === 0)
    // remove prefix from filename and add the 'browser' path
    .map(item => item.substr(this.prefix.length));
  }
}
exports.Storage = Storage;

/***/ }),

/***/ "../../../dist/libs/remix-lib/src/util.js":
/*!*******************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-lib/src/util.js ***!
  \*******************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.escapeRegExp = exports.concatWithSeperator = exports.groupBy = exports.compareByteCode = exports.getinputParameters = exports.extractinputParameters = exports.extractSwarmHash = exports.extractcborMetadata = exports.inputParametersExtraction = exports.cborEncodedValueExtraction = exports.swarmHashExtractionPOC32 = exports.swarmHashExtractionPOC31 = exports.swarmHashExtraction = exports.sha3_256 = exports.buildCallPath = exports.findCall = exports.findClosestIndex = exports.findLowerBoundValue = exports.findLowerBound = exports.formatMemory = exports.hexListFromBNs = exports.hexToIntArray = void 0;
const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");
const ethereumjs_util_1 = __webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js");
const string_similarity_1 = (0, tslib_1.__importDefault)(__webpack_require__(/*! string-similarity */ "../../../node_modules/string-similarity/src/index.js"));
/*
 contains misc util: @TODO should be splitted
  - hex conversion
  - binary search
  - CALL related look up
  - sha3 calculation
  - swarm hash extraction
  - bytecode comparison
*/
/*
    ints: IntArray
  */
/**
   * Converts a hex string to an array of integers.
   */
function hexToIntArray(hexString) {
  if (hexString.slice(0, 2) === '0x') {
    hexString = hexString.slice(2);
  }
  const integers = [];
  for (let i = 0; i < hexString.length; i += 2) {
    integers.push(parseInt(hexString.slice(i, i + 2), 16));
  }
  return integers;
}
exports.hexToIntArray = hexToIntArray;
/*
    ints: list of BNs
  */
function hexListFromBNs(bnList) {
  const ret = [];
  for (const k in bnList) {
    const v = bnList[k];
    if (ethereumjs_util_1.BN.isBN(v)) {
      ret.push('0x' + v.toString('hex', 64));
    } else {
      ret.push('0x' + new ethereumjs_util_1.BN(v).toString('hex', 64)); // TEMP FIX TO REMOVE ONCE https://github.com/ethereumjs/ethereumjs-vm/pull/293 is released
    }
  }

  return ret;
}
exports.hexListFromBNs = hexListFromBNs;
/*
  ints: ints: IntArray
*/
function formatMemory(mem) {
  const hexMem = (0, ethereumjs_util_1.bufferToHex)(mem).substr(2);
  const ret = [];
  for (let k = 0; k < hexMem.length; k += 32) {
    const row = hexMem.substr(k, 32);
    ret.push(row);
  }
  return ret;
}
exports.formatMemory = formatMemory;
/*
  Binary Search:
  Assumes that @arg array is sorted increasingly
  return largest i such that array[i] <= target; return -1 if array[0] > target || array is empty
*/
function findLowerBound(target, array) {
  let start = 0;
  let length = array.length;
  while (length > 0) {
    const half = length >> 1;
    const middle = start + half;
    if (array[middle] <= target) {
      length = length - 1 - half;
      start = middle + 1;
    } else {
      length = half;
    }
  }
  return start - 1;
}
exports.findLowerBound = findLowerBound;
/*
  Binary Search:
  Assumes that @arg array is sorted increasingly
  return largest array[i] such that array[i] <= target; return null if array[0] > target || array is empty
*/
function findLowerBoundValue(target, array) {
  const index = findLowerBound(target, array);
  return index >= 0 ? array[index] : null;
}
exports.findLowerBoundValue = findLowerBoundValue;
/*
  Binary Search:
  Assumes that @arg array is sorted increasingly
  return Return i such that |array[i] - target| is smallest among all i and -1 for an empty array.
  Returns the smallest i for multiple candidates.
*/
function findClosestIndex(target, array) {
  if (array.length === 0) {
    return -1;
  }
  const index = findLowerBound(target, array);
  if (index < 0) {
    return 0;
  } else if (index >= array.length - 1) {
    return array.length - 1;
  } else {
    const middle = (array[index] + array[index + 1]) / 2;
    return target <= middle ? index : index + 1;
  }
}
exports.findClosestIndex = findClosestIndex;
/**
  * Find the call from @args rootCall which contains @args index (recursive)
  *
  * @param {Int} index - index of the vmtrace
  * @param {Object} rootCall  - call tree, built by the trace analyser
  * @return {Object} - return the call which include the @args index
  */
function findCall(index, rootCall) {
  const ret = buildCallPath(index, rootCall);
  return ret[ret.length - 1];
}
exports.findCall = findCall;
/**
  * Find calls path from @args rootCall which leads to @args index (recursive)
  *
  * @param {Int} index - index of the vmtrace
  * @param {Object} rootCall  - call tree, built by the trace analyser
  * @return {Array} - return the calls path to @args index
  */
function buildCallPath(index, rootCall) {
  const ret = [];
  findCallInternal(index, rootCall, ret);
  return ret;
}
exports.buildCallPath = buildCallPath;
/**
  * sha3 the given @arg value (left pad to 32 bytes)
  *
  * @param {String} value - value to sha3
  * @return {Object} - return sha3ied value
  */
// eslint-disable-next-line camelcase
function sha3_256(value) {
  value = (0, ethereumjs_util_1.toBuffer)((0, ethereumjs_util_1.addHexPrefix)(value));
  const retInBuffer = (0, ethereumjs_util_1.keccak)((0, ethereumjs_util_1.setLengthLeft)(value, 32));
  return (0, ethereumjs_util_1.bufferToHex)(retInBuffer);
}
exports.sha3_256 = sha3_256;
/**
  * return a regex which extract the swarmhash from the bytecode.
  *
  * @return {RegEx}
  */
function swarmHashExtraction() {
  return /a165627a7a72305820([0-9a-f]{64})0029$/;
}
exports.swarmHashExtraction = swarmHashExtraction;
/**
  * return a regex which extract the swarmhash from the bytecode, from POC 0.3
  *
  * @return {RegEx}
  */
function swarmHashExtractionPOC31() {
  return /a265627a7a72315820([0-9a-f]{64})64736f6c6343([0-9a-f]{6})0032$/;
}
exports.swarmHashExtractionPOC31 = swarmHashExtractionPOC31;
/**
  * return a regex which extract the swarmhash from the bytecode, from POC 0.3
  *
  * @return {RegEx}
  */
function swarmHashExtractionPOC32() {
  return /a265627a7a72305820([0-9a-f]{64})64736f6c6343([0-9a-f]{6})0032$/;
}
exports.swarmHashExtractionPOC32 = swarmHashExtractionPOC32;
/**
  * return a regex which extract the cbor encoded metadata : {"ipfs": <IPFS hash>, "solc": <compiler version>} from the bytecode.
  * ref https://solidity.readthedocs.io/en/v0.6.6/metadata.html?highlight=ipfs#encoding-of-the-metadata-hash-in-the-bytecode
  * @return {RegEx}
  */
function cborEncodedValueExtraction() {
  return /64697066735822([0-9a-f]{68})64736f6c6343([0-9a-f]{6})0033$/;
}
exports.cborEncodedValueExtraction = cborEncodedValueExtraction;
/**
  * return a regex which extract the input parameters from the bytecode
  *
  * @return {RegEx}
  */
function inputParametersExtraction() {
  return /64697066735822[0-9a-f]{68}64736f6c6343[0-9a-f]{6}0033(.*)$/;
}
exports.inputParametersExtraction = inputParametersExtraction;
function extractcborMetadata(value) {
  return value.replace(cborEncodedValueExtraction(), '');
}
exports.extractcborMetadata = extractcborMetadata;
function extractSwarmHash(value) {
  value = value.replace(swarmHashExtraction(), '');
  value = value.replace(swarmHashExtractionPOC31(), '');
  value = value.replace(swarmHashExtractionPOC32(), '');
  return value;
}
exports.extractSwarmHash = extractSwarmHash;
function extractinputParameters(value) {
  return value.replace(inputParametersExtraction(), '');
}
exports.extractinputParameters = extractinputParameters;
function getinputParameters(value) {
  const regex = value.match(inputParametersExtraction());
  if (regex && regex[1]) {
    return regex[1];
  } else return '';
}
exports.getinputParameters = getinputParameters;
/**
  * Compare bytecode. return true if the code is equal (handle swarm hash and library references)
  * @param {String} code1 - the bytecode that is actually deployed (contains resolved library reference and a potentially different swarmhash)
  * @param {String} code2 - the bytecode generated by the compiler (contains unresolved library reference and a potentially different swarmhash)
                            this will return false if the generated bytecode is empty (asbtract contract cannot be deployed)
  *
  * @return {bool}
  */
function compareByteCode(code1, code2) {
  if (code1 === code2) return true;
  if (code2 === '0x') return false; // abstract contract. see comment
  if (code2.substr(2, 46) === '7300000000000000000000000000000000000000003014') {
    // testing the following signature: PUSH20 00..00 ADDRESS EQ
    // in the context of a library, that slot contains the address of the library (pushed by the compiler to avoid calling library other than with a DELEGATECALL)
    // if code2 is not a library, well we still suppose that the comparison remain relevant even if we remove some information from `code1`
    code1 = replaceLibReference(code1, 4);
  }
  let pos = -1;
  while ((pos = code2.search(/__(.*)__/)) !== -1) {
    code2 = replaceLibReference(code2, pos);
    code1 = replaceLibReference(code1, pos);
  }
  code1 = extractinputParameters(code1);
  code1 = extractSwarmHash(code1);
  code1 = extractcborMetadata(code1);
  code2 = extractinputParameters(code2);
  code2 = extractSwarmHash(code2);
  code2 = extractcborMetadata(code2);
  if (code1 && code2) {
    const compare = string_similarity_1.default.compareTwoStrings(code1, code2);
    return compare == 1;
  }
  return false;
}
exports.compareByteCode = compareByteCode;
/* util extracted out from remix-ide. @TODO split this file, cause it mix real util fn with solidity related stuff ... */
function groupBy(arr, key) {
  return arr.reduce((sum, item) => {
    const groupByVal = item[key];
    const groupedItems = sum[groupByVal] || [];
    groupedItems.push(item);
    sum[groupByVal] = groupedItems;
    return sum;
  }, {});
}
exports.groupBy = groupBy;
function concatWithSeperator(list, seperator) {
  return list.reduce((sum, item) => sum + item + seperator, '').slice(0, -seperator.length);
}
exports.concatWithSeperator = concatWithSeperator;
function escapeRegExp(str) {
  return str.replace(/[-[\]/{}()+?.\\^$|]/g, '\\$&');
}
exports.escapeRegExp = escapeRegExp;
function replaceLibReference(code, pos) {
  return code.substring(0, pos) + '0000000000000000000000000000000000000000' + code.substring(pos + 40);
}
function findCallInternal(index, rootCall, callsPath) {
  const calls = Object.keys(rootCall.calls);
  const ret = rootCall;
  callsPath.push(rootCall);
  for (const k in calls) {
    const subCall = rootCall.calls[calls[k]];
    if (index >= subCall.start && index <= subCall.return) {
      findCallInternal(index, subCall, callsPath);
      break;
    }
  }
  return ret;
}

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/compiler/compiler-abstract.js":
/*!**********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/compiler/compiler-abstract.js ***!
  \**********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CompilerAbstract = void 0;
const helper_1 = __webpack_require__(/*! ./helper */ "../../../dist/libs/remix-solidity/src/compiler/helper.js");
class CompilerAbstract {
  constructor(languageversion, data, source, input) {
    this.languageversion = languageversion;
    this.data = data;
    this.source = source; // source code
    this.input = input;
  }
  getContracts() {
    return this.data.contracts || {};
  }
  getContract(name) {
    return helper_1.default.getContract(name, this.data.contracts);
  }
  visitContracts(calllback) {
    return helper_1.default.visitContracts(this.data.contracts, calllback);
  }
  getData() {
    return this.data;
  }
  getInput() {
    return this.input;
  }
  getAsts() {
    return this.data.sources; // ast
  }

  getSourceName(fileIndex) {
    if (this.data && this.data.sources) {
      return Object.keys(this.data.sources)[fileIndex];
    } else if (Object.keys(this.source.sources).length === 1) {
      // if we don't have ast, we return the only one filename present.
      const sourcesArray = Object.keys(this.source.sources);
      return sourcesArray[0];
    }
    return null;
  }
  getSourceCode() {
    return this.source;
  }
}
exports.CompilerAbstract = CompilerAbstract;

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/compiler/compiler-helpers.js":
/*!*********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/compiler/compiler-helpers.js ***!
  \*********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compile = void 0;
const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");
const compiler_utils_1 = __webpack_require__(/*! ./compiler-utils */ "../../../dist/libs/remix-solidity/src/compiler/compiler-utils.js");
const compiler_abstract_1 = __webpack_require__(/*! ./compiler-abstract */ "../../../dist/libs/remix-solidity/src/compiler/compiler-abstract.js");
const compiler_1 = __webpack_require__(/*! ./compiler */ "../../../dist/libs/remix-solidity/src/compiler/compiler.js");
const compile = (compilationTargets, settings, contentResolverCallback) => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
  const res = yield (() => {
    return new Promise((resolve, reject) => {
      const compiler = new compiler_1.Compiler(contentResolverCallback);
      compiler.set('evmVersion', settings.evmVersion);
      compiler.set('optimize', settings.optimize);
      compiler.set('language', settings.language);
      compiler.set('runs', settings.runs);
      compiler.loadVersion((0, compiler_utils_1.canUseWorker)(settings.version), (0, compiler_utils_1.urlFromVersion)(settings.version));
      compiler.event.register('compilationFinished', (success, compilationData, source, input, version) => {
        resolve(new compiler_abstract_1.CompilerAbstract(settings.version, compilationData, source, input));
      });
      compiler.event.register('compilerLoaded', _ => compiler.compile(compilationTargets, ''));
    });
  })();
  return res;
});
exports.compile = compile;

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/compiler/compiler-input.js":
/*!*******************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/compiler/compiler-input.js ***!
  \*******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compilerInputForConfigFile = exports.getValidLanguage = exports.Languages = void 0;
exports.default = (sources, opts) => {
  const o = {
    language: 'Solidity',
    sources: sources,
    settings: {
      optimizer: {
        enabled: opts.optimize === true || opts.optimize === 1,
        runs: opts.runs || 200
      },
      libraries: opts.libraries,
      outputSelection: {
        '*': {
          '': ['ast'],
          '*': ['abi', 'metadata', 'devdoc', 'userdoc', 'storageLayout', 'evm.legacyAssembly', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'evm.gasEstimates', 'evm.assembly']
        }
      }
    }
  };
  if (opts.evmVersion) {
    if (opts.evmVersion.toLowerCase() == 'default') {
      opts.evmVersion = null;
    } else {
      o.settings.evmVersion = opts.evmVersion;
    }
  }
  if (opts.language) {
    o.language = opts.language;
  }
  if (opts.language === 'Yul' && o.settings.optimizer.enabled) {
    if (!o.settings.optimizer.details) {
      o.settings.optimizer.details = {};
    }
    o.settings.optimizer.details.yul = true;
  }
  return JSON.stringify(o);
};
exports.Languages = ['Solidity', 'Yul'];
function getValidLanguage(val) {
  if (val !== undefined && val !== null && val) {
    const lang = val.slice(0, 1).toUpperCase() + val.slice(1).toLowerCase();
    return exports.Languages.indexOf(lang) > -1 ? lang : null;
  }
  return null;
}
exports.getValidLanguage = getValidLanguage;
function compilerInputForConfigFile(sources, opts) {
  opts.sources = sources;
  return JSON.stringify(opts);
}
exports.compilerInputForConfigFile = compilerInputForConfigFile;

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/compiler/compiler-utils.js":
/*!*******************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/compiler/compiler-utils.js ***!
  \*******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.promisedMiniXhr = exports.canUseWorker = exports.urlFromVersion = exports.pathToURL = exports.baseURLWasm = exports.baseURLBin = void 0;
const semver = __webpack_require__(/*! semver */ "../../../node_modules/@nrwl/web/node_modules/semver/index.js");
const minixhr = __webpack_require__(/*! minixhr */ "../../../node_modules/minixhr/minixhr.js");
/* global Worker */
exports.baseURLBin = 'https://binaries.soliditylang.org/bin';
exports.baseURLWasm = 'https://binaries.soliditylang.org/wasm';
exports.pathToURL = {};
/**
 * Retrieves the URL of the given compiler version
 * @param version is the version of compiler with or without 'soljson-v' prefix and .js postfix
 */
function urlFromVersion(version) {
  let url;
  if (version === 'builtin') {
    let location = window.document.location;
    let path = location.pathname;
    if (!path.startsWith('/')) path = '/' + path;
    location = `${location.protocol}//${location.host}${path}assets/js`;
    if (location.endsWith('index.html')) location = location.substring(0, location.length - 10);
    if (!location.endsWith('/')) location += '/';
    url = `${location}soljson.js`;
  } else {
    version = version.replace('.Emscripten.clang', '');
    if (!version.startsWith('soljson-v')) version = 'soljson-v' + version;
    if (!version.endsWith('.js')) version = version + '.js';
    url = `${exports.pathToURL[version]}/${version}`;
  }
  return url;
}
exports.urlFromVersion = urlFromVersion;
/**
 * Checks if the worker can be used to load a compiler.
 * checks a compiler whitelist, browser support and OS.
 */
function canUseWorker(selectedVersion) {
  if (selectedVersion.startsWith('http')) {
    return browserSupportWorker();
  }
  const version = semver.coerce(selectedVersion);
  if (!version) {
    return browserSupportWorker();
  }
  const isNightly = selectedVersion.includes('nightly');
  return browserSupportWorker() && (
  // All compiler versions (including nightlies) after 0.6.3 are wasm compiled
  semver.gt(version, '0.6.3') ||
  // Only releases are wasm compiled starting with 0.3.6
  semver.gte(version, '0.3.6') && !isNightly);
}
exports.canUseWorker = canUseWorker;
function browserSupportWorker() {
  return document.location.protocol !== 'file:' && Worker !== undefined;
}
// returns a promise for minixhr
function promisedMiniXhr(url) {
  return new Promise((resolve, reject) => {
    minixhr(url, (json, event) => {
      resolve({
        json,
        event
      });
    });
  });
}
exports.promisedMiniXhr = promisedMiniXhr;

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/compiler/compiler-worker.js":
/*!********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/compiler/compiler-worker.js ***!
  \********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
const solc = __webpack_require__(/*! solc/wrapper */ "../../../node_modules/solc/wrapper.js");
let compileJSON = input => {
  return '';
};
const missingInputs = [];
// 'DedicatedWorkerGlobalScope' object (the Worker global scope) is accessible through the self keyword
// 'dom' and 'webworker' library files can't be included together https://github.com/microsoft/TypeScript/issues/20595
function default_1(self) {
  self.addEventListener('message', e => {
    const data = e.data;
    switch (data.cmd) {
      case 'loadVersion':
        {
          delete self.Module;
          // NOTE: workaround some browsers?
          self.Module = undefined;
          compileJSON = null;
          // importScripts() method of synchronously imports one or more scripts into the worker's scope
          self.importScripts(data.data);
          const compiler = solc(self.Module);
          compileJSON = input => {
            try {
              const missingInputsCallback = path => {
                missingInputs.push(path);
                return {
                  error: 'Deferred import'
                };
              };
              return compiler.compile(input, {
                import: missingInputsCallback
              });
            } catch (exception) {
              return JSON.stringify({
                error: 'Uncaught JavaScript exception:\n' + exception
              });
            }
          };
          self.postMessage({
            cmd: 'versionLoaded',
            data: compiler.version(),
            license: compiler.license()
          });
          break;
        }
      case 'compile':
        missingInputs.length = 0;
        if (data.input && compileJSON) {
          self.postMessage({
            cmd: 'compiled',
            job: data.job,
            timestamp: data.timestamp,
            data: compileJSON(data.input),
            input: data.input,
            missingInputs: missingInputs
          });
        }
        break;
    }
  }, false);
}
exports.default = default_1;

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/compiler/compiler.js":
/*!*************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/compiler/compiler.js ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Compiler = void 0;
const abi_1 = __webpack_require__(/*! solc/abi */ "../../../node_modules/solc/abi.js");
const webworkify = __webpack_require__(/*! webworkify-webpack */ "../../../node_modules/webworkify-webpack/index.js");
const compiler_input_1 = __webpack_require__(/*! ./compiler-input */ "../../../dist/libs/remix-solidity/src/compiler/compiler-input.js");
const eventManager_1 = __webpack_require__(/*! ../lib/eventManager */ "../../../dist/libs/remix-solidity/src/lib/eventManager.js");
const helper_1 = __webpack_require__(/*! ./helper */ "../../../dist/libs/remix-solidity/src/compiler/helper.js");
const types_1 = __webpack_require__(/*! ./types */ "../../../dist/libs/remix-solidity/src/compiler/types.js");
/*
  trigger compilationFinished, compilerLoaded, compilationStarted, compilationDuration
*/
class Compiler {
  constructor(handleImportCall) {
    this.handleImportCall = handleImportCall;
    this.event = new eventManager_1.default();
    this.state = {
      compileJSON: null,
      worker: null,
      currentVersion: null,
      compilerLicense: null,
      optimize: false,
      runs: 200,
      evmVersion: null,
      language: 'Solidity',
      compilationStartTime: null,
      target: null,
      useFileConfiguration: false,
      configFileContent: '',
      compilerRetriggerMode: types_1.CompilerRetriggerMode.none,
      lastCompilationResult: {
        data: null,
        source: null
      }
    };
    this.event.register('compilationFinished', (success, data, source, input, version) => {
      if (success && this.state.compilationStartTime) {
        this.event.trigger('compilationDuration', [new Date().getTime() - this.state.compilationStartTime]);
      }
      this.state.compilationStartTime = null;
    });
    this.event.register('compilationStarted', () => {});
  }
  /**
   * @dev Setter function for CompilerState's properties (used by IDE)
   * @param key key
   * @param value value of key in CompilerState
   */
  set(key, value) {
    this.state[key] = value;
    if (key === 'runs') this.state['runs'] = parseInt(value);
  }
  /**
   * @dev Internal function to compile the contract after gathering imports
   * @param files source file
   * @param missingInputs missing import file path list
   */
  internalCompile(files, missingInputs) {
    this.gatherImports(files, missingInputs, (error, input) => {
      if (error) {
        this.state.lastCompilationResult = null;
        this.event.trigger('compilationFinished', [false, {
          error: {
            formattedMessage: error,
            severity: 'error'
          }
        }, files, input, this.state.currentVersion]);
      } else if (this.state.compileJSON && input) {
        this.state.compileJSON(input);
      }
    });
  }
  /**
   * @dev Compile source files (used by IDE)
   * @param files source files
   * @param target target file name (This is passed as it is to IDE)
   */
  compile(files, target) {
    this.state.target = target;
    this.state.compilationStartTime = new Date().getTime();
    this.event.trigger('compilationStarted', []);
    this.internalCompile(files);
  }
  /**
   * @dev Called when compiler is loaded, set current compiler version
   * @param version compiler version
   */
  onCompilerLoaded(version, license) {
    this.state.currentVersion = version;
    this.state.compilerLicense = license;
    this.event.trigger('compilerLoaded', [version, license]);
  }
  /**
   * @dev Called when compiler is loaded internally (without worker)
   */
  onInternalCompilerLoaded() {
    if (this.state.worker === null) {
      const compiler = typeof window !== 'undefined' && window['Module'] ? __webpack_require__(/*! solc/wrapper */ "../../../node_modules/solc/wrapper.js")(window['Module']) : __webpack_require__(/*! solc */ "../../../node_modules/solc/index.js"); // eslint-disable-line
      this.state.compileJSON = source => {
        const missingInputs = [];
        const missingInputsCallback = path => {
          missingInputs.push(path);
          return {
            error: 'Deferred import'
          };
        };
        let result = {};
        let input = "";
        try {
          if (source && source.sources) {
            const {
              optimize,
              runs,
              evmVersion,
              language,
              useFileConfiguration,
              configFileContent
            } = this.state;
            if (useFileConfiguration) {
              input = (0, compiler_input_1.compilerInputForConfigFile)(source.sources, JSON.parse(configFileContent));
            } else {
              input = (0, compiler_input_1.default)(source.sources, {
                optimize,
                runs,
                evmVersion,
                language
              });
            }
            result = JSON.parse(compiler.compile(input, {
              import: missingInputsCallback
            }));
          }
        } catch (exception) {
          result = {
            error: {
              formattedMessage: 'Uncaught JavaScript exception:\n' + exception,
              severity: 'error',
              mode: 'panic'
            }
          };
        }
        this.onCompilationFinished(result, missingInputs, source, input, this.state.currentVersion);
      };
      this.onCompilerLoaded(compiler.version(), compiler.license());
    }
  }
  /**
   * @dev Called when compilation is finished
   * @param data compilation result data
   * @param missingInputs missing imports
   * @param source Source
   */
  onCompilationFinished(data, missingInputs, source, input, version) {
    let noFatalErrors = true; // ie warnings are ok
    const checkIfFatalError = error => {
      // Ignore warnings and the 'Deferred import' error as those are generated by us as a workaround
      const isValidError = error.message && error.message.includes('Deferred import') ? false : error.severity !== 'warning';
      if (isValidError) noFatalErrors = false;
    };
    if (data.error) checkIfFatalError(data.error);
    if (data.errors) data.errors.forEach(err => checkIfFatalError(err));
    if (!noFatalErrors) {
      // There are fatal errors, abort here
      this.state.lastCompilationResult = null;
      this.event.trigger('compilationFinished', [false, data, source, input, version]);
    } else if (missingInputs !== undefined && missingInputs.length > 0 && source && source.sources) {
      // try compiling again with the new set of inputs
      this.internalCompile(source.sources, missingInputs);
    } else {
      data = this.updateInterface(data);
      if (source) {
        source.target = this.state.target;
        this.state.lastCompilationResult = {
          data: data,
          source: source
        };
      }
      this.event.trigger('compilationFinished', [true, data, source, input, version]);
    }
  }
  /**
   * @dev Load compiler using given version (used by remix-tests CLI)
   * @param version compiler version
   */
  loadRemoteVersion(version) {
    console.log(`Loading remote solc version ${version} ...`);
    const compiler = __webpack_require__(/*! solc */ "../../../node_modules/solc/index.js"); // eslint-disable-line
    compiler.loadRemoteVersion(version, (err, remoteCompiler) => {
      if (err) {
        console.error('Error in loading remote solc compiler: ', err);
      } else {
        let license;
        this.state.compileJSON = source => {
          const missingInputs = [];
          const missingInputsCallback = path => {
            missingInputs.push(path);
            return {
              error: 'Deferred import'
            };
          };
          let result = {};
          let input = "";
          try {
            if (source && source.sources) {
              const {
                optimize,
                runs,
                evmVersion,
                language,
                useFileConfiguration,
                configFileContent
              } = this.state;
              if (useFileConfiguration) {
                input = (0, compiler_input_1.compilerInputForConfigFile)(source.sources, JSON.parse(configFileContent));
              } else {
                input = (0, compiler_input_1.default)(source.sources, {
                  optimize,
                  runs,
                  evmVersion,
                  language
                });
              }
              result = JSON.parse(remoteCompiler.compile(input, {
                import: missingInputsCallback
              }));
              license = remoteCompiler.license();
            }
          } catch (exception) {
            result = {
              error: {
                formattedMessage: 'Uncaught JavaScript exception:\n' + exception,
                severity: 'error',
                mode: 'panic'
              }
            };
          }
          this.onCompilationFinished(result, missingInputs, source, input, version);
        };
        this.onCompilerLoaded(version, license);
      }
    });
  }
  /**
   * @dev Load compiler using given URL (used by IDE)
   * @param usingWorker if true, load compiler using worker
   * @param url URL to load compiler from
   */
  loadVersion(usingWorker, url) {
    console.log('Loading ' + url + ' ' + (usingWorker ? 'with worker' : 'without worker'));
    this.event.trigger('loadingCompiler', [url, usingWorker]);
    if (this.state.worker) {
      this.state.worker.terminate();
      this.state.worker = null;
    }
    if (usingWorker) {
      this.loadWorker(url);
    } else {
      this.loadInternal(url);
    }
  }
  /**
   * @dev Load compiler using 'script' element (without worker)
   * @param url URL to load compiler from
   */
  loadInternal(url) {
    delete window['Module'];
    // NOTE: workaround some browsers?
    window['Module'] = undefined;
    // Set a safe fallback until the new one is loaded
    this.state.compileJSON = source => {
      this.onCompilationFinished({
        error: {
          formattedMessage: 'Compiler not yet loaded.'
        }
      });
    };
    const newScript = document.createElement('script');
    newScript.type = 'text/javascript';
    newScript.src = url;
    document.getElementsByTagName('head')[0].appendChild(newScript);
    const check = window.setInterval(() => {
      if (!window['Module']) {
        return;
      }
      window.clearInterval(check);
      this.onInternalCompilerLoaded();
    }, 200);
  }
  /**
   * @dev Load compiler using web worker
   * @param url URL to load compiler from
   */
  loadWorker(url) {
    this.state.worker = webworkify(/*require.resolve*/(/*! ./compiler-worker */ "../../../dist/libs/remix-solidity/src/compiler/compiler-worker.js"));
    const jobs = [];
    this.state.worker.addEventListener('message', msg => {
      const data = msg.data;
      if (this.state.compilerRetriggerMode == types_1.CompilerRetriggerMode.retrigger && data.timestamp !== this.state.compilationStartTime) {
        return;
      }
      switch (data.cmd) {
        case 'versionLoaded':
          if (data.data) this.onCompilerLoaded(data.data, data.license);
          break;
        case 'compiled':
          {
            let result;
            if (data.data && data.job !== undefined && data.job >= 0) {
              try {
                result = JSON.parse(data.data);
              } catch (exception) {
                result = {
                  error: {
                    formattedMessage: 'Invalid JSON output from the compiler: ' + exception
                  }
                };
              }
              let sources = {};
              if (data.job in jobs !== undefined) {
                sources = jobs[data.job].sources;
                delete jobs[data.job];
              }
              this.onCompilationFinished(result, data.missingInputs, sources, data.input, this.state.currentVersion);
            }
            break;
          }
      }
    });
    this.state.worker.addEventListener('error', msg => {
      const formattedMessage = `Worker error: ${msg.data && msg.data !== undefined ? msg.data : msg['message']}`;
      this.onCompilationFinished({
        error: {
          formattedMessage
        }
      });
    });
    this.state.compileJSON = source => {
      if (source && source.sources) {
        const {
          optimize,
          runs,
          evmVersion,
          language,
          useFileConfiguration,
          configFileContent
        } = this.state;
        jobs.push({
          sources: source
        });
        let input = "";
        try {
          if (useFileConfiguration) {
            input = (0, compiler_input_1.compilerInputForConfigFile)(source.sources, JSON.parse(configFileContent));
          } else {
            input = (0, compiler_input_1.default)(source.sources, {
              optimize,
              runs,
              evmVersion,
              language
            });
          }
        } catch (exception) {
          this.onCompilationFinished({
            error: {
              formattedMessage: exception.message
            }
          }, [], source, "", this.state.currentVersion);
          return;
        }
        this.state.worker.postMessage({
          cmd: 'compile',
          job: jobs.length - 1,
          input: input,
          timestamp: this.state.compilationStartTime
        });
      }
    };
    this.state.worker.postMessage({
      cmd: 'loadVersion',
      data: url
    });
  }
  /**
   * @dev Gather imports for compilation
   * @param files file sources
   * @param importHints import file list
   * @param cb callback
   */
  gatherImports(files, importHints, cb) {
    importHints = importHints || [];
    // FIXME: This will only match imports if the file begins with one '.'
    // It should tokenize by lines and check each.
    const importRegex = /^\s*import\s*['"]([^'"]+)['"];/g;
    for (const fileName in files) {
      let match;
      while (match = importRegex.exec(files[fileName].content)) {
        let importFilePath = match[1];
        if (importFilePath.startsWith('./')) {
          const path = /(.*\/).*/.exec(fileName);
          importFilePath = path ? importFilePath.replace('./', path[1]) : importFilePath.slice(2);
        }
        if (!importHints.includes(importFilePath)) importHints.push(importFilePath);
      }
    }
    while (importHints.length > 0) {
      const m = importHints.pop();
      if (m && m in files) continue;
      if (this.handleImportCall) {
        this.handleImportCall(m, (err, content) => {
          if (err && cb) cb(err);else {
            files[m] = {
              content
            };
            this.gatherImports(files, importHints, cb);
          }
        });
      }
      return;
    }
    if (cb) {
      cb(null, {
        sources: files
      });
    }
  }
  /**
   * @dev Truncate version string
   * @param version version
   */
  truncateVersion(version) {
    const tmp = /^(\d+.\d+.\d+)/.exec(version);
    return tmp ? tmp[1] : version;
  }
  /**
   * @dev Update ABI according to current compiler version
   * @param data Compilation result
   */
  updateInterface(data) {
    helper_1.default.visitContracts(data.contracts, contract => {
      if (!contract.object.abi) contract.object.abi = [];
      if (this.state.language === 'Yul' && contract.object.abi.length === 0) {
        // yul compiler does not return any abi,
        // we default to accept the fallback function (which expect raw data as argument).
        contract.object.abi.push({
          payable: true,
          stateMutability: 'payable',
          type: 'fallback'
        });
      }
      if (data && data.contracts && this.state.currentVersion) {
        const version = this.truncateVersion(this.state.currentVersion);
        data.contracts[contract.file][contract.name].abi = (0, abi_1.update)(version, contract.object.abi);
        // if "constant" , payable must not be true and stateMutability must be view.
        // see https://github.com/ethereum/solc-js/issues/500
        for (const item of data.contracts[contract.file][contract.name].abi) {
          if ((0, types_1.isFunctionDescription)(item) && item.constant) {
            item.payable = false;
            item.stateMutability = 'view';
          }
        }
      }
    });
    return data;
  }
  /**
   * @dev Get contract obj of the given contract name from last compilation result.
   * @param name contract name
   */
  getContract(name) {
    if (this.state.lastCompilationResult && this.state.lastCompilationResult.data && this.state.lastCompilationResult.data.contracts) {
      return helper_1.default.getContract(name, this.state.lastCompilationResult.data.contracts);
    }
    return null;
  }
  /**
   * @dev Call the given callback for all the contracts from last compilation result
   * @param cb callback
   */
  visitContracts(cb) {
    if (this.state.lastCompilationResult && this.state.lastCompilationResult.data && this.state.lastCompilationResult.data.contracts) {
      return helper_1.default.visitContracts(this.state.lastCompilationResult.data.contracts, cb);
    }
    return null;
  }
  /**
   * @dev Get the compiled contracts data from last compilation result
   */
  getContracts() {
    if (this.state.lastCompilationResult && this.state.lastCompilationResult.data && this.state.lastCompilationResult.data.contracts) {
      return this.state.lastCompilationResult.data.contracts;
    }
    return null;
  }
  /**
   * @dev Get sources from last compilation result
   */
  getSources() {
    if (this.state.lastCompilationResult && this.state.lastCompilationResult.source) {
      return this.state.lastCompilationResult.source.sources;
    }
    return null;
  }
  /**
   * @dev Get sources of passed file name from last compilation result
   * @param fileName file name
   */
  getSource(fileName) {
    if (this.state.lastCompilationResult && this.state.lastCompilationResult.source && this.state.lastCompilationResult.source.sources) {
      return this.state.lastCompilationResult.source.sources[fileName];
    }
    return null;
  }
  /**
   * @dev Get source name at passed index from last compilation result
   * @param index    - index of the source
   */
  getSourceName(index) {
    if (this.state.lastCompilationResult && this.state.lastCompilationResult.data && this.state.lastCompilationResult.data.sources) {
      return Object.keys(this.state.lastCompilationResult.data.sources)[index];
    }
    return null;
  }
}
exports.Compiler = Compiler;

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/compiler/helper.js":
/*!***********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/compiler/helper.js ***!
  \***********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = {
  /**
   * @dev Get contract obj of given contract name from last compilation result.
   * @param name contract name
   * @param contracts 'contracts' object from last compilation result
   */
  getContract: (contractName, contracts) => {
    for (const file in contracts) {
      if (contracts[file][contractName]) {
        return {
          object: contracts[file][contractName],
          file: file
        };
      }
    }
    return null;
  },
  /**
   * @dev call the given callback for all contracts from last compilation result, stop visiting when cb return true
   * @param contracts - 'contracts' object from last compilation result
   * @param cb    - callback
   */
  visitContracts: (contracts, cb) => {
    for (const file in contracts) {
      for (const name in contracts[file]) {
        const param = {
          name: name,
          object: contracts[file][name],
          file: file
        };
        if (cb(param)) return;
      }
    }
  },
  // ^ e.g:
  // browser/gm.sol: Warning: Source file does not specify required compiler version! Consider adding "pragma solidity ^0.6.12
  // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v3.2.0/contracts/introspection/IERC1820Registry.sol:3:1: ParserError: Source file requires different compiler version (current compiler is 0.7.4+commit.3f05b770.Emscripten.clang) - note that nightly builds are considered to be strictly less than the released version
  getPositionDetails: msg => {
    const result = {};
    // To handle some compiler warning without location like SPDX license warning etc
    if (!msg.includes(':')) return {
      errLine: -1,
      errCol: -1,
      errFile: ''
    };
    if (msg.includes('-->')) msg = msg.split('-->')[1].trim();
    // extract line / column
    let pos = msg.match(/^(.*?):([0-9]*?):([0-9]*?)?/);
    result.errLine = pos ? parseInt(pos[2]) - 1 : -1;
    result.errCol = pos ? parseInt(pos[3]) : -1;
    // extract file
    pos = msg.match(/^(https:.*?|http:.*?|.*?):/);
    result.errFile = pos ? pos[1] : msg;
    return result;
  }
};

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/compiler/types.js":
/*!**********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/compiler/types.js ***!
  \**********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isEventDescription = exports.isFunctionDescription = exports.CompilerRetriggerMode = void 0;
var CompilerRetriggerMode;
(function (CompilerRetriggerMode) {
  CompilerRetriggerMode[CompilerRetriggerMode["none"] = 0] = "none";
  CompilerRetriggerMode[CompilerRetriggerMode["retrigger"] = 1] = "retrigger";
})(CompilerRetriggerMode = exports.CompilerRetriggerMode || (exports.CompilerRetriggerMode = {}));
const isFunctionDescription = item => item.stateMutability !== undefined;
exports.isFunctionDescription = isFunctionDescription;
const isEventDescription = item => item.type === 'event';
exports.isEventDescription = isEventDescription;

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/index.js":
/*!*************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/index.js ***!
  \*************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.helper = exports.urlFromVersion = exports.canUseWorker = exports.baseURLWasm = exports.baseURLBin = exports.pathToURL = exports.promisedMiniXhr = exports.CompilerAbstract = exports.getValidLanguage = exports.CompilerInput = exports.compile = exports.Compiler = void 0;
const tslib_1 = __webpack_require__(/*! tslib */ "../../../node_modules/tslib/tslib.es6.js");
var compiler_1 = __webpack_require__(/*! ./compiler/compiler */ "../../../dist/libs/remix-solidity/src/compiler/compiler.js");
Object.defineProperty(exports, "Compiler", {
  enumerable: true,
  get: function () {
    return compiler_1.Compiler;
  }
});
var compiler_helpers_1 = __webpack_require__(/*! ./compiler/compiler-helpers */ "../../../dist/libs/remix-solidity/src/compiler/compiler-helpers.js");
Object.defineProperty(exports, "compile", {
  enumerable: true,
  get: function () {
    return compiler_helpers_1.compile;
  }
});
var compiler_input_1 = __webpack_require__(/*! ./compiler/compiler-input */ "../../../dist/libs/remix-solidity/src/compiler/compiler-input.js");
Object.defineProperty(exports, "CompilerInput", {
  enumerable: true,
  get: function () {
    return compiler_input_1.default;
  }
});
Object.defineProperty(exports, "getValidLanguage", {
  enumerable: true,
  get: function () {
    return compiler_input_1.getValidLanguage;
  }
});
var compiler_abstract_1 = __webpack_require__(/*! ./compiler/compiler-abstract */ "../../../dist/libs/remix-solidity/src/compiler/compiler-abstract.js");
Object.defineProperty(exports, "CompilerAbstract", {
  enumerable: true,
  get: function () {
    return compiler_abstract_1.CompilerAbstract;
  }
});
(0, tslib_1.__exportStar)(__webpack_require__(/*! ./compiler/types */ "../../../dist/libs/remix-solidity/src/compiler/types.js"), exports);
var compiler_utils_1 = __webpack_require__(/*! ./compiler/compiler-utils */ "../../../dist/libs/remix-solidity/src/compiler/compiler-utils.js");
Object.defineProperty(exports, "promisedMiniXhr", {
  enumerable: true,
  get: function () {
    return compiler_utils_1.promisedMiniXhr;
  }
});
Object.defineProperty(exports, "pathToURL", {
  enumerable: true,
  get: function () {
    return compiler_utils_1.pathToURL;
  }
});
Object.defineProperty(exports, "baseURLBin", {
  enumerable: true,
  get: function () {
    return compiler_utils_1.baseURLBin;
  }
});
Object.defineProperty(exports, "baseURLWasm", {
  enumerable: true,
  get: function () {
    return compiler_utils_1.baseURLWasm;
  }
});
Object.defineProperty(exports, "canUseWorker", {
  enumerable: true,
  get: function () {
    return compiler_utils_1.canUseWorker;
  }
});
Object.defineProperty(exports, "urlFromVersion", {
  enumerable: true,
  get: function () {
    return compiler_utils_1.urlFromVersion;
  }
});
var helper_1 = __webpack_require__(/*! ./compiler/helper */ "../../../dist/libs/remix-solidity/src/compiler/helper.js");
Object.defineProperty(exports, "helper", {
  enumerable: true,
  get: function () {
    return helper_1.default;
  }
});

/***/ }),

/***/ "../../../dist/libs/remix-solidity/src/lib/eventManager.js":
/*!************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/dist/libs/remix-solidity/src/lib/eventManager.js ***!
  \************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
class EventManager {
  constructor() {
    this.registered = {}; // eslint-disable-line
    this.anonymous = {}; // eslint-disable-line
  }
  /*
   * Unregister a listener.
   * Note that if obj is a function. the unregistration will be applied to the dummy obj {}.
   *
   * @param {String} eventName  - the event name
   * @param {Object or Func} obj - object that will listen on this event
   * @param {Func} func         - function of the listeners that will be executed
  */
  unregister(eventName, obj, func) {
    if (!this.registered[eventName]) {
      return;
    }
    if (obj instanceof Function) {
      func = obj;
      obj = this.anonymous;
    }
    for (const reg in this.registered[eventName]) {
      if (this.registered[eventName][reg].obj === obj && this.registered[eventName][reg].func.toString() === func.toString()) {
        this.registered[eventName].splice(reg, 1);
      }
    }
  }
  /*
   * Register a new listener.
   * Note that if obj is a function, the function registration will be associated with the dummy object {}
   *
   * @param {String} eventName  - the event name
   * @param {Object or Func} obj - object that will listen on this event
   * @param {Func} func         - function of the listeners that will be executed
  */
  register(eventName, obj, func) {
    if (!this.registered[eventName]) {
      this.registered[eventName] = [];
    }
    if (obj instanceof Function) {
      func = obj;
      obj = this.anonymous;
    }
    this.registered[eventName].push({
      obj: obj,
      func: func
    });
  }
  /*
   * trigger event.
   * Every listener have their associated function executed
   *
   * @param {String} eventName  - the event name
   * @param {Array}j - argument that will be passed to the executed function.
  */
  trigger(eventName, args) {
    if (!this.registered[eventName]) {
      return;
    }
    for (const listener in this.registered[eventName]) {
      const l = this.registered[eventName][listener];
      if (l.func) l.func.apply(l.obj === this.anonymous ? {} : l.obj, args);
    }
  }
}
exports.default = EventManager;

/***/ }),

/***/ "../../../libs/remix-ui/clipboard/src/index.ts":
/*!************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/clipboard/src/index.ts ***!
  \************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _copyToClipboard = __webpack_require__(/*! ./lib/copy-to-clipboard/copy-to-clipboard */ "../../../libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.tsx");
Object.keys(_copyToClipboard).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _copyToClipboard[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _copyToClipboard[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.css":
/*!***********************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.css ***!
  \***********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./copy-to-clipboard.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.tsx":
/*!***********************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.tsx ***!
  \***********************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.CopyToClipboard = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _objectWithoutProperties2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/objectWithoutProperties */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/objectWithoutProperties.js"));
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _copyToClipboard = _interopRequireDefault(__webpack_require__(/*! copy-to-clipboard */ "../../../node_modules/copy-to-clipboard/index.js"));
__webpack_require__(/*! ./copy-to-clipboard.css */ "../../../libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.css");
var _helper = __webpack_require__(/*! @remix-ui/helper */ "../../../libs/remix-ui/helper/src/index.ts");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
const _excluded = ["tip", "icon", "direction", "getContent", "children"];
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const CopyToClipboard = props => {
  const {
      tip = 'Copy',
      icon = 'fa-copy',
      direction = 'right',
      getContent,
      children
    } = props,
    otherProps = (0, _objectWithoutProperties2.default)(props, _excluded);
  let {
    content
  } = props;
  const [message, setMessage] = (0, _react.useState)(tip);
  const copyData = () => {
    try {
      if (content === '') {
        setMessage('Cannot copy empty content!');
        return;
      }
      if (typeof content !== 'string') {
        content = JSON.stringify(content, null, '\t');
      }
      (0, _copyToClipboard.default)(content);
      setMessage('Copied');
    } catch (e) {
      console.error(e);
    }
  };
  const handleClick = e => {
    if (content) {
      // module `copy` keeps last copied thing in the memory, so don't show tooltip if nothing is copied, because nothing was added to memory
      copyData();
    } else {
      content = getContent && getContent();
      copyData();
    }
    e.preventDefault();
  };
  const reset = () => {
    setTimeout(() => setMessage(tip), 500);
  };
  const childJSX = children || /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", _objectSpread({
    className: `far ${icon} ml-1 p-2`,
    "aria-hidden": "true"
  }, otherProps), void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 54,
    columnNumber: 18
  }, void 0);
  return (
    /*#__PURE__*/
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    (0, _jsxDevRuntime.jsxDEV)("a", {
      href: "#",
      onClick: handleClick,
      onMouseLeave: reset,
      children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
        tooltipText: message,
        tooltipId: "overlay-tooltip",
        placement: direction,
        children: childJSX
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 62,
        columnNumber: 7
      }, void 0)
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 61,
      columnNumber: 5
    }, void 0)
  );
};
exports.CopyToClipboard = CopyToClipboard;
var _default = CopyToClipboard;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/helper/src/index.ts":
/*!*********************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/helper/src/index.ts ***!
  \*********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _remixUiHelper = __webpack_require__(/*! ./lib/remix-ui-helper */ "../../../libs/remix-ui/helper/src/lib/remix-ui-helper.ts");
Object.keys(_remixUiHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _remixUiHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _remixUiHelper[key];
    }
  });
});
var _bleach = __webpack_require__(/*! ./lib/bleach */ "../../../libs/remix-ui/helper/src/lib/bleach.ts");
Object.keys(_bleach).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _bleach[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _bleach[key];
    }
  });
});
var _helperComponents = __webpack_require__(/*! ./lib/helper-components */ "../../../libs/remix-ui/helper/src/lib/helper-components.tsx");
Object.keys(_helperComponents).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _helperComponents[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _helperComponents[key];
    }
  });
});
var _PluginViewWrapper = __webpack_require__(/*! ./lib/components/PluginViewWrapper */ "../../../libs/remix-ui/helper/src/lib/components/PluginViewWrapper.tsx");
Object.keys(_PluginViewWrapper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _PluginViewWrapper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _PluginViewWrapper[key];
    }
  });
});
var _customDropdown = __webpack_require__(/*! ./lib/components/custom-dropdown */ "../../../libs/remix-ui/helper/src/lib/components/custom-dropdown.tsx");
Object.keys(_customDropdown).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _customDropdown[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _customDropdown[key];
    }
  });
});
var _customTooltip = __webpack_require__(/*! ./lib/components/custom-tooltip */ "../../../libs/remix-ui/helper/src/lib/components/custom-tooltip.tsx");
Object.keys(_customTooltip).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _customTooltip[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _customTooltip[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/helper/src/lib/bleach.ts":
/*!**************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/helper/src/lib/bleach.ts ***!
  \**************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.bleach = void 0;
var he = _interopRequireWildcard(__webpack_require__(/*! he */ "../../../node_modules/he/he.js"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
/*
 * remixBleach
 * a minimal html sanitizer
 * credits to cam@onswipe.com
 */

const bleach = {
  matcher: /<\/?([a-zA-Z0-9]+)*(.*?)\/?>/igm,
  whitelist: ['a', 'b', 'p', 'em', 'strong'],
  analyze: function (html) {
    html = String(html) || '';
    const matches = [];
    let match;

    // extract all tags
    while ((match = bleach.matcher.exec(html)) != null) {
      const attrr = match[2].split(' ');
      const attrs = [];

      // extract attributes from the tag
      attrr.shift();
      attrr.forEach(attr => {
        attr = attr.split('=');
        const attrName = attr[0];
        let attrValue = attr.length > 1 ? attr.slice(1).join('=') : null;
        // remove quotes from attributes
        if (attrValue && attrValue.charAt(0).match(/'|"/)) attrValue = attrValue.slice(1);
        if (attrValue && attrValue.charAt(attrValue.length - 1).match(/'|"/)) attrValue = attrValue.slice(0, -1);
        attr = {
          name: attrName,
          value: attrValue
        };
        if (!attr.value) delete attr.value;
        if (attr.name) attrs.push(attr);
      });
      const tag = {
        full: match[0],
        name: match[1],
        attr: attrs
      };
      matches.push(tag);
    }
    return matches;
  },
  sanitize: function (html, options = {
    mode: 'white',
    list: bleach.whitelist,
    encode_entities: false
  }) {
    html = String(html) || '';
    const mode = options.mode || 'white';
    const list = options.list || bleach.whitelist;
    const matches = bleach.analyze(html);
    if (mode === 'white' && list.indexOf('script') === -1 || mode === 'black' && list.indexOf('script') !== -1) {
      html = html.replace(/<script(.*?)>(.*?[\r\n])*?(.*?)(.*?[\r\n])*?<\/script>/gim, '');
    }
    if (mode === 'white' && list.indexOf('style') === -1 || mode === 'black' && list.indexOf('style') !== -1) {
      html = html.replace(/<style(.*?)>(.*?[\r\n])*?(.*?)(.*?[\r\n])*?<\/style>/gim, '');
    }
    matches.forEach(function (tag) {
      if (mode === 'white') {
        if (list.indexOf(tag.name) === -1) {
          html = html.replace(tag.full, '');
        }
      } else if (mode === 'black') {
        if (list.indexOf(tag.name) !== -1) {
          html = html.replace(tag.full, '');
        }
      } else {
        throw new Error('Unknown sanitization mode "' + mode + '"');
      }
    });
    if (options.encode_entities) html = he.encode(html);
    return html;
  }
};
exports.bleach = bleach;

/***/ }),

/***/ "../../../libs/remix-ui/helper/src/lib/components/PluginViewWrapper.tsx":
/*!*************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/helper/src/lib/components/PluginViewWrapper.tsx ***!
  \*************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PluginViewWrapper = void 0;
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const PluginViewWrapper = props => {
  const [state, setState] = (0, _react.useState)(null);
  (0, _react.useEffect)(() => {
    if (props.plugin.setDispatch) {
      props.plugin.setDispatch(setState);
    }
  }, []);
  return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, state ? /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, props.plugin.updateComponent(state)) : /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null));
};
exports.PluginViewWrapper = PluginViewWrapper;

/***/ }),

/***/ "../../../libs/remix-ui/helper/src/lib/components/custom-dropdown.tsx":
/*!***********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/helper/src/lib/components/custom-dropdown.tsx ***!
  \***********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CustomToggle = exports.CustomMenu = exports.CustomIconsToggle = void 0;
var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// The forwardRef is important!!

// Dropdown needs access to the DOM node in order to position the Menu
const CustomToggle = _react.default.forwardRef(({
  children,
  onClick,
  icon,
  className = ''
}, ref) => /*#__PURE__*/_react.default.createElement("button", {
  ref: ref,
  onClick: e => {
    e.preventDefault();
    onClick(e);
  },
  className: className.replace('dropdown-toggle', '')
}, /*#__PURE__*/_react.default.createElement("div", {
  className: "d-flex"
}, /*#__PURE__*/_react.default.createElement("div", {
  className: "mr-auto"
}, children), icon && /*#__PURE__*/_react.default.createElement("div", {
  className: "pr-1"
}, /*#__PURE__*/_react.default.createElement("i", {
  className: `${icon} pr-1`
})), /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("i", {
  className: "fad fa-sort-circle"
})))));
exports.CustomToggle = CustomToggle;
const CustomIconsToggle = _react.default.forwardRef(({
  onClick,
  icon,
  className = ''
}, ref) => /*#__PURE__*/_react.default.createElement("span", {
  ref: ref,
  onClick: e => {
    e.preventDefault();
    onClick();
  },
  className: `${className.replace('dropdown-toggle', '')} mb-0 pb-0 d-flex justify-content-end align-items-end remixuimenuicon_shadow fs-3`,
  "data-id": "workspaceMenuDropdown"
}, icon && /*#__PURE__*/_react.default.createElement("i", {
  style: {
    fontSize: 'large'
  },
  className: `${icon}`,
  "data-icon": "workspaceDropdownMenuIcon"
})));

// forwardRef again here!
// Dropdown needs access to the DOM of the Menu to measure it
exports.CustomIconsToggle = CustomIconsToggle;
const CustomMenu = _react.default.forwardRef(({
  children,
  style,
  className,
  'aria-labelledby': labeledBy
}, ref) => {
  return /*#__PURE__*/_react.default.createElement("div", {
    ref: ref,
    style: style,
    className: className,
    "aria-labelledby": labeledBy
  }, /*#__PURE__*/_react.default.createElement("ul", {
    className: "list-unstyled mb-0"
  }, children));
});
exports.CustomMenu = CustomMenu;

/***/ }),

/***/ "../../../libs/remix-ui/helper/src/lib/components/custom-tooltip.tsx":
/*!**********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/helper/src/lib/components/custom-tooltip.tsx ***!
  \**********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CustomTooltip = CustomTooltip;
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _reactBootstrap = __webpack_require__(/*! react-bootstrap */ "../../../node_modules/react-bootstrap/esm/index.js");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function CustomTooltip({
  children,
  placement,
  tooltipId,
  tooltipClasses,
  tooltipText,
  tooltipTextClasses
}) {
  return /*#__PURE__*/_react.default.createElement(_react.Fragment, null, /*#__PURE__*/_react.default.createElement(_reactBootstrap.OverlayTrigger, {
    placement: placement,
    overlay: /*#__PURE__*/_react.default.createElement(_reactBootstrap.Tooltip, {
      id: !tooltipId ? `${tooltipText}Tooltip` : tooltipId,
      className: tooltipClasses
    }, typeof tooltipText === 'string' ? /*#__PURE__*/_react.default.createElement("span", {
      className: tooltipTextClasses
    }, tooltipText) : tooltipText)
  }, children));
}

/***/ }),

/***/ "../../../libs/remix-ui/helper/src/lib/helper-components.tsx":
/*!**************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/helper/src/lib/helper-components.tsx ***!
  \**************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.upgradeWithProxyMsg = exports.storageFullMessage = exports.sourceVerificationNotAvailableToastMsg = exports.recursivePasteToastMsg = exports.notFoundToastMsg = exports.logBuilder = exports.localCompilationToastMsg = exports.fileChangedToastMsg = exports.envChangeNotification = exports.deployWithProxyMsg = exports.compilingToastMsg = exports.compilerConfigChangedToastMsg = exports.compileToastMsg = exports.compilationFinishedToastMsg = exports.cancelUpgradeMsg = exports.cancelProxyMsg = void 0;
var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const fileChangedToastMsg = (from, path) => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("i", {
  className: "fas fa-exclamation-triangle text-danger mr-1"
}), /*#__PURE__*/_react.default.createElement("span", null, from, " ", /*#__PURE__*/_react.default.createElement("span", {
  className: "font-weight-bold text-warning"
}, "is modifying"), " ", path));
exports.fileChangedToastMsg = fileChangedToastMsg;
const compilerConfigChangedToastMsg = (from, value) => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, from), " is updating the ", /*#__PURE__*/_react.default.createElement("b", null, "Solidity compiler configuration"), ".", /*#__PURE__*/_react.default.createElement("pre", {
  className: "text-left"
}, value));
exports.compilerConfigChangedToastMsg = compilerConfigChangedToastMsg;
const compileToastMsg = (from, fileName) => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, from), " is requiring to compile ", /*#__PURE__*/_react.default.createElement("b", null, fileName));
exports.compileToastMsg = compileToastMsg;
const compilingToastMsg = settings => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Recompiling and debugging with params"), /*#__PURE__*/_react.default.createElement("pre", {
  className: "text-left"
}, settings));
exports.compilingToastMsg = compilingToastMsg;
const compilationFinishedToastMsg = () => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Compilation failed..."), " continuing ", /*#__PURE__*/_react.default.createElement("i", null, "without"), " source code debugging.");
exports.compilationFinishedToastMsg = compilationFinishedToastMsg;
const notFoundToastMsg = address => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Contract ", address, " not found in source code repository"), " continuing ", /*#__PURE__*/_react.default.createElement("i", null, "without"), " source code debugging.");
exports.notFoundToastMsg = notFoundToastMsg;
const localCompilationToastMsg = () => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Using compilation result from Solidity module"));
exports.localCompilationToastMsg = localCompilationToastMsg;
const sourceVerificationNotAvailableToastMsg = () => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Source verification plugin not activated or not available."), " continuing ", /*#__PURE__*/_react.default.createElement("i", null, "without"), " source code debugging.");
exports.sourceVerificationNotAvailableToastMsg = sourceVerificationNotAvailableToastMsg;
const envChangeNotification = (env, from) => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("i", {
  className: "fas fa-exclamation-triangle text-danger mr-1"
}), /*#__PURE__*/_react.default.createElement("span", null, from + ' ', /*#__PURE__*/_react.default.createElement("span", {
  className: "font-weight-bold text-warning"
}, "set your environment to"), " ", env && env.context));
exports.envChangeNotification = envChangeNotification;
const storageFullMessage = () => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("i", {
  className: "fas fa-exclamation-triangle text-danger mr-1"
}), /*#__PURE__*/_react.default.createElement("span", {
  className: "font-weight-bold"
}, /*#__PURE__*/_react.default.createElement("span", null, "Cannot save this file due to full LocalStorage. Backup existing files and free up some space.")));
exports.storageFullMessage = storageFullMessage;
const recursivePasteToastMsg = () => /*#__PURE__*/_react.default.createElement("div", null, "File(s) to paste is an ancestor of the destination folder");
exports.recursivePasteToastMsg = recursivePasteToastMsg;
const logBuilder = msg => {
  return /*#__PURE__*/_react.default.createElement("pre", null, msg);
};
exports.logBuilder = logBuilder;
const cancelProxyMsg = () => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Proxy deployment cancelled."));
exports.cancelProxyMsg = cancelProxyMsg;
const cancelUpgradeMsg = () => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Upgrade with proxy cancelled."));
exports.cancelUpgradeMsg = cancelUpgradeMsg;
const deployWithProxyMsg = () => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Deploy with Proxy"), " will initiate two (2) transactions:", /*#__PURE__*/_react.default.createElement("ol", {
  className: "pl-3"
}, /*#__PURE__*/_react.default.createElement("li", {
  key: "impl-contract"
}, "Deploying the implementation contract"), /*#__PURE__*/_react.default.createElement("li", {
  key: "proxy-contract"
}, "Deploying an ERC1967 proxy contract")));
exports.deployWithProxyMsg = deployWithProxyMsg;
const upgradeWithProxyMsg = () => /*#__PURE__*/_react.default.createElement("div", null, /*#__PURE__*/_react.default.createElement("b", null, "Upgrade with Proxy"), " will initiate two (2) transactions:", /*#__PURE__*/_react.default.createElement("ol", {
  className: "pl-3"
}, /*#__PURE__*/_react.default.createElement("li", {
  key: "new-impl-contract"
}, "Deploying the new implementation contract"), /*#__PURE__*/_react.default.createElement("li", {
  key: "update-proxy-contract"
}, "Updating the proxy contract with the address of the new implementation contract")));
exports.upgradeWithProxyMsg = upgradeWithProxyMsg;

/***/ }),

/***/ "../../../libs/remix-ui/helper/src/lib/remix-ui-helper.ts":
/*!***********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/helper/src/lib/remix-ui-helper.ts ***!
  \***********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.shortenHexData = exports.shortenAddress = exports.joinPath = exports.isValidHash = exports.isNumeric = exports.isHexadecimal = exports.is0XPrefixed = exports.getPathIcon = exports.extractParentFromKey = exports.extractNameFromKey = exports.createNonClashingTitle = exports.createNonClashingNameAsync = exports.checkSpecialChars = exports.checkSlash = exports.addressToString = exports.addSlash = void 0;
var ethJSUtil = _interopRequireWildcard(__webpack_require__(/*! ethereumjs-util */ "../../../node_modules/ethereumjs-util/dist.browser/index.js"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const extractNameFromKey = key => {
  if (!key) return;
  const keyPath = key.split('/');
  return keyPath[keyPath.length - 1];
};
exports.extractNameFromKey = extractNameFromKey;
const extractParentFromKey = key => {
  if (!key) return;
  const keyPath = key.split('/');
  keyPath.pop();
  return keyPath.join('/');
};
exports.extractParentFromKey = extractParentFromKey;
const checkSpecialChars = name => {
  return name.match(/[:*?"<>\\'|]/) != null;
};
exports.checkSpecialChars = checkSpecialChars;
const checkSlash = name => {
  return name.match(/\//) != null;
};
exports.checkSlash = checkSlash;
const createNonClashingNameAsync = async (name, fileManager, prefix = '') => {
  if (!name) name = 'Undefined';
  let _counter;
  let ext = 'sol';
  const reg = /(.*)\.([^.]+)/g;
  const split = reg.exec(name);
  if (split) {
    name = split[1];
    ext = split[2];
  }
  let exist = true;
  do {
    const isDuplicate = await fileManager.exists(name + (_counter || '') + prefix + '.' + ext);
    if (isDuplicate) _counter = (_counter || 0) + 1;else exist = false;
  } while (exist);
  const counter = _counter || '';
  return name + counter + prefix + '.' + ext;
};
exports.createNonClashingNameAsync = createNonClashingNameAsync;
const createNonClashingTitle = async (name, fileManager) => {
  if (!name) name = 'Undefined';
  let _counter;
  let exist = true;
  do {
    const isDuplicate = await fileManager.exists(name + (_counter || ''));
    if (isDuplicate) _counter = (_counter || 0) + 1;else exist = false;
  } while (exist);
  const counter = _counter || '';
  return name + counter;
};
exports.createNonClashingTitle = createNonClashingTitle;
const joinPath = (...paths) => {
  paths = paths.filter(value => value !== '').map(path => path.replace(/^\/|\/$/g, '')); // remove first and last slash)
  if (paths.length === 1) return paths[0];
  return paths.join('/');
};
exports.joinPath = joinPath;
const getPathIcon = path => {
  return path.endsWith('.txt') ? 'far fa-file-alt' : path.endsWith('.md') ? 'fab fa-markdown' : path.endsWith('.sol') ? 'fak fa-solidity-mono' : path.endsWith('.js') ? 'fab fa-js' : path.endsWith('.json') ? 'small fas fa-brackets-curly' : path.endsWith('.vy') ? 'small fak fa-vyper2' : path.endsWith('.lex') ? 'fak fa-lexon' : path.endsWith('ts') ? 'small fak fa-ts-logo' : path.endsWith('.tsc') ? 'fad fa-brackets-curly' : path.endsWith('.cairo') ? 'small fak fa-cairo' : 'far fa-file';
};
exports.getPathIcon = getPathIcon;
const isNumeric = value => {
  return /^\+?(0|[1-9]\d*)$/.test(value);
};
exports.isNumeric = isNumeric;
const shortenAddress = (address, etherBalance) => {
  const len = address.length;
  return address.slice(0, 5) + '...' + address.slice(len - 5, len) + (etherBalance ? ' (' + etherBalance.toString() + ' ether)' : '');
};
exports.shortenAddress = shortenAddress;
const addressToString = address => {
  if (!address) return null;
  if (typeof address !== 'string') {
    address = address.toString('hex');
  }
  if (address.indexOf('0x') === -1) {
    address = '0x' + address;
  }
  return ethJSUtil.toChecksumAddress(address);
};
exports.addressToString = addressToString;
const is0XPrefixed = value => {
  return value.substr(0, 2) === '0x';
};
exports.is0XPrefixed = is0XPrefixed;
const isHexadecimal = value => {
  return /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;
};
exports.isHexadecimal = isHexadecimal;
const isValidHash = hash => {
  // 0x prefixed, hexadecimal, 64digit
  const hexValue = hash.slice(2, hash.length);
  return is0XPrefixed(hash) && /^[0-9a-fA-F]{64}$/.test(hexValue);
};
exports.isValidHash = isValidHash;
const shortenHexData = data => {
  if (!data) return '';
  if (data.length < 5) return data;
  const len = data.length;
  return data.slice(0, 5) + '...' + data.slice(len - 5, len);
};
exports.shortenHexData = shortenHexData;
const addSlash = file => {
  if (!file.startsWith('/')) file = '/' + file;
  return file;
};
exports.addSlash = addSlash;

/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/index.ts":
/*!***************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/index.ts ***!
  \***************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _modalDialogCustom = __webpack_require__(/*! ./lib/modal-dialog-custom */ "../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.tsx");
Object.keys(_modalDialogCustom).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _modalDialogCustom[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _modalDialogCustom[key];
    }
  });
});
var _remixUiModalDialog = __webpack_require__(/*! ./lib/remix-ui-modal-dialog */ "../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.tsx");
Object.keys(_remixUiModalDialog).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _remixUiModalDialog[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _remixUiModalDialog[key];
    }
  });
});
var _index = __webpack_require__(/*! ./lib/types/index */ "../../../libs/remix-ui/modal-dialog/src/lib/types/index.ts");
Object.keys(_index).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _index[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _index[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css":
/*!**********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css ***!
  \**********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./modal-dialog-custom.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.tsx":
/*!**********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.tsx ***!
  \**********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ModalDialogCustom = void 0;
var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
__webpack_require__(/*! ./modal-dialog-custom.css */ "../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.tsx";
const ModalDialogCustom = props => {
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
    children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("h1", {
      children: "Welcome to modal-dialog-custom!"
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 11,
      columnNumber: 7
    }, void 0)
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 10,
    columnNumber: 5
  }, void 0);
};
exports.ModalDialogCustom = ModalDialogCustom;
var _default = ModalDialogCustom;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css":
/*!************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css ***!
  \************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./remix-ui-modal-dialog.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.tsx":
/*!************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.tsx ***!
  \************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ModalDialog = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
__webpack_require__(/*! ./remix-ui-modal-dialog.css */ "../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const ModalDialog = props => {
  const [state, setState] = (0, _react.useState)({
    toggleBtn: true
  });
  const calledHideFunctionOnce = (0, _react.useRef)();
  const modal = (0, _react.useRef)(null);
  const handleHide = () => {
    if (!calledHideFunctionOnce.current) {
      props.handleHide();
    }
    calledHideFunctionOnce.current = true;
  };
  (0, _react.useEffect)(() => {
    calledHideFunctionOnce.current = props.hide;
    modal.current.focus();
  }, [props.hide]);
  (0, _react.useEffect)(() => {
    function handleBlur(e) {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        e.stopPropagation();
        if (document.activeElement !== this) {
          !window.testmode && handleHide();
        }
      }
    }
    if (modal.current) {
      modal.current.addEventListener('blur', handleBlur);
    }
    return () => {
      modal.current && modal.current.removeEventListener('blur', handleBlur);
    };
  }, [modal.current]);
  const modalKeyEvent = keyCode => {
    if (keyCode === 27) {
      // Esc
      if (props.cancelFn) props.cancelFn();
      handleHide();
    } else if (keyCode === 13) {
      // Enter
      enterHandler();
    } else if (keyCode === 37) {
      // todo && footerIsActive) { // Arrow Left
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          toggleBtn: true
        });
      });
    } else if (keyCode === 39) {
      // todo && footerIsActive) { // Arrow Right
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          toggleBtn: false
        });
      });
    }
  };
  const enterHandler = () => {
    if (state.toggleBtn) {
      if (props.okFn) props.okFn();
    } else {
      if (props.cancelFn) props.cancelFn();
    }
    handleHide();
  };
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
    "data-id": `${props.id}ModalDialogContainer-react`,
    "data-backdrop": "static",
    "data-keyboard": "false",
    className: "modal",
    style: {
      display: props.hide ? 'none' : 'block'
    },
    role: "dialog",
    children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      className: "modal-dialog",
      role: "document",
      children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        ref: modal,
        tabIndex: -1,
        className: 'modal-content remixModalContent ' + (props.modalClass ? props.modalClass : ''),
        onKeyDown: ({
          keyCode
        }) => {
          modalKeyEvent(keyCode);
        },
        children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "modal-header",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("h6", {
            className: "modal-title",
            "data-id": `${props.id}ModalDialogModalTitle-react`,
            children: props.title && props.title
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 85,
            columnNumber: 13
          }, void 0), !props.showCancelIcon && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
            className: "modal-close",
            onClick: () => handleHide(),
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
              title: "Close",
              className: "fas fa-times",
              "aria-hidden": "true"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 90,
              columnNumber: 17
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 89,
            columnNumber: 15
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 84,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "modal-body text-break remixModalBody",
          "data-id": `${props.id}ModalDialogModalBody-react`,
          children: props.children ? props.children : props.message
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 94,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "modal-footer",
          "data-id": `${props.id}ModalDialogModalFooter-react`,
          children: [props.okLabel && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            "data-id": `${props.id}-modal-footer-ok-react`,
            className: 'modal-ok btn btn-sm ' + (state.toggleBtn ? 'btn-dark' : 'btn-light'),
            disabled: props.validation && !props.validation.valid,
            onClick: () => {
              if (props.validation && !props.validation.valid) return;
              if (props.okFn) props.okFn();
              handleHide();
            },
            children: props.okLabel ? props.okLabel : 'OK'
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 99,
            columnNumber: 32
          }, void 0), props.cancelLabel && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            "data-id": `${props.id}-modal-footer-cancel-react`,
            className: 'modal-cancel btn btn-sm ' + (state.toggleBtn ? 'btn-light' : 'btn-dark'),
            "data-dismiss": "modal",
            onClick: () => {
              if (props.cancelFn) props.cancelFn();
              handleHide();
            },
            children: props.cancelLabel ? props.cancelLabel : 'Cancel'
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 112,
            columnNumber: 36
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 97,
          columnNumber: 11
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 78,
        columnNumber: 9
      }, void 0)
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 77,
      columnNumber: 7
    }, void 0)
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 69,
    columnNumber: 5
  }, void 0);
};
exports.ModalDialog = ModalDialog;
var _default = ModalDialog;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/modal-dialog/src/lib/types/index.ts":
/*!*************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/types/index.ts ***!
  \*************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/***/ }),

/***/ "../../../libs/remix-ui/publish-to-storage/src/index.ts":
/*!*********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/publish-to-storage/src/index.ts ***!
  \*********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _publishToStorage = __webpack_require__(/*! ./lib/publish-to-storage */ "../../../libs/remix-ui/publish-to-storage/src/lib/publish-to-storage.tsx");
Object.keys(_publishToStorage).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _publishToStorage[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _publishToStorage[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/publish-to-storage/src/lib/publish-to-storage.tsx":
/*!***************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/publish-to-storage/src/lib/publish-to-storage.tsx ***!
  \***************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.PublishToStorage = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _modalDialog = __webpack_require__(/*! @remix-ui/modal-dialog */ "../../../libs/remix-ui/modal-dialog/src/index.ts");
var _publishToIPFS = __webpack_require__(/*! ./publishToIPFS */ "../../../libs/remix-ui/publish-to-storage/src/lib/publishToIPFS.tsx");
var _publishOnSwarm = __webpack_require__(/*! ./publishOnSwarm */ "../../../libs/remix-ui/publish-to-storage/src/lib/publishOnSwarm.tsx");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/publish-to-storage/src/lib/publish-to-storage.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const PublishToStorage = props => {
  const {
    api,
    storage,
    contract,
    resetStorage
  } = props;
  const [modalShown, setModalShown] = (0, _react.useState)(false);
  const [state, setState] = (0, _react.useState)({
    modal: {
      title: '',
      message: null,
      hide: true,
      okLabel: '',
      okFn: null,
      cancelLabel: '',
      cancelFn: null
    }
  });
  (0, _react.useEffect)(() => {
    const storageService = async () => {
      if (contract.metadata === undefined || contract.metadata.length === 0) {
        modal('Publish To Storage', 'This contract may be abstract, it may not implement an abstract parent\'s methods completely or it may not invoke an inherited contract\'s constructor correctly.');
      } else {
        if (storage === 'swarm') {
          try {
            const result = await (0, _publishOnSwarm.publishToSwarm)(contract, api);
            modal(`Published ${contract.name}'s Metadata and Sources`, publishMessage(result.uploaded));
          } catch (err) {
            modal('Swarm Publish Failed', publishMessageFailed(storage, err.message));
          }
        } else {
          if (!api.config.get('settings/ipfs-url') && !modalShown) {
            modal('IPFS Settings', /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
              children: ["You have not set your own custom IPFS settings.", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 38,
                columnNumber: 88
              }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 39,
                columnNumber: 15
              }, void 0), "We won\u2019t be providing a public endpoint anymore for publishing your contracts to IPFS.", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 40,
                columnNumber: 101
              }, void 0), "Instead of that, 4 options are now available:", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 40,
                columnNumber: 155
              }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 41,
                columnNumber: 15
              }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("ul", {
                className: "pl-3",
                children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("li", {
                  children: "DEFAULT OPTION: Use the public INFURA node. This will not guarantee your data will persist."
                }, "ipfs-default", false, {
                  fileName: _jsxFileName,
                  lineNumber: 43,
                  columnNumber: 17
                }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("li", {
                  children: ["Use your own INFURA IPFS node. This requires a subscription. ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("a", {
                    href: "https://infura.io/product/ipfs",
                    target: '_blank',
                    children: "Learn more"
                  }, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 48,
                    columnNumber: 80
                  }, void 0)]
                }, "infura-options", true, {
                  fileName: _jsxFileName,
                  lineNumber: 47,
                  columnNumber: 17
                }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("li", {
                  children: "Use any external IPFS which doesn\u2019t require any authentification."
                }, "ipfs-external", false, {
                  fileName: _jsxFileName,
                  lineNumber: 50,
                  columnNumber: 17
                }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("li", {
                  children: "Use your own local ipfs node (which usually runs under http://localhost:5001)"
                }, "ipfs-local", false, {
                  fileName: _jsxFileName,
                  lineNumber: 53,
                  columnNumber: 17
                }, void 0)]
              }, void 0, true, {
                fileName: _jsxFileName,
                lineNumber: 42,
                columnNumber: 15
              }, void 0), "You can update your IPFS settings in the SETTINGS tab.", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 58,
                columnNumber: 15
              }, void 0), "Now the default option will be used."]
            }, void 0, true, {
              fileName: _jsxFileName,
              lineNumber: 38,
              columnNumber: 36
            }, void 0), async () => await ipfs(contract, api));
          } else {
            await ipfs(contract, api);
          }
        }
      }
    };
    if (storage) {
      storageService();
    }
  }, [storage]);
  const ipfs = async (contract, api) => {
    try {
      const result = await (0, _publishToIPFS.publishToIPFS)(contract, api);
      modal(`Published ${contract.name}'s Metadata and Sources`, publishMessage(result.uploaded));
    } catch (err) {
      modal('IPFS Publish Failed', publishMessageFailed(storage, err.message));
    }
    setModalShown(true);
  };
  const publishMessage = uploaded => /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
    children: [" Metadata and sources of \"", contract.name.toLowerCase(), "\" were published successfully. ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 85,
      columnNumber: 97
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("pre", {
      children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        children: uploaded.map((value, index) => /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("b", {
            children: value.filename
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 88,
            columnNumber: 60
          }, void 0), " : ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("pre", {
            children: value.output.url
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 88,
            columnNumber: 86
          }, void 0)]
        }, index, true, {
          fileName: _jsxFileName,
          lineNumber: 88,
          columnNumber: 43
        }, void 0))
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 87,
        columnNumber: 9
      }, void 0)
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 86,
      columnNumber: 7
    }, void 0)]
  }, void 0, true, {
    fileName: _jsxFileName,
    lineNumber: 85,
    columnNumber: 5
  }, void 0);
  const publishMessageFailed = (storage, err) => /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
    children: ["Failed to publish metadata file and sources to ", storage, ", please check the ", storage, " gateways is available. ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 95,
      columnNumber: 119
    }, void 0), err]
  }, void 0, true, {
    fileName: _jsxFileName,
    lineNumber: 95,
    columnNumber: 5
  }, void 0);
  const handleHideModal = () => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        modal: _objectSpread(_objectSpread({}, prevState.modal), {}, {
          hide: true,
          message: null
        })
      });
    });
    resetStorage();
  };
  const modal = async (title, message, okFn = () => {}) => {
    await setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        modal: _objectSpread(_objectSpread({}, prevState.modal), {}, {
          hide: false,
          message,
          title,
          okFn
        })
      });
    });
  };
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_modalDialog.ModalDialog, {
    id: props.id || 'publishToStorage',
    title: state.modal.title,
    message: state.modal.message,
    hide: state.modal.hide,
    okLabel: "OK",
    okFn: state.modal.okFn,
    handleHide: handleHideModal,
    children: typeof state.modal.message !== 'string' && state.modal.message
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 123,
    columnNumber: 5
  }, void 0);
};
exports.PublishToStorage = PublishToStorage;
var _default = PublishToStorage;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/publish-to-storage/src/lib/publishOnSwarm.tsx":
/*!***********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/publish-to-storage/src/lib/publishOnSwarm.tsx ***!
  \***********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.publishToSwarm = void 0;
var _beeJs = __webpack_require__(/*! @ethersphere/bee-js */ "../../../node_modules/@ethersphere/bee-js/dist/index.browser.min.js");
// public gateway node address
const publicBeeNode = new _beeJs.Bee('https://api.gateway.ethswarm.org/');

// on the public gateway the postage stamp id is not relevant, so we use all zeroes
const defaultPostageStampId = '0000000000000000000000000000000000000000000000000000000000000000';
const publishToSwarm = async (contract, api) => {
  // gather list of files to publish
  const sources = [];
  let metadata;
  const item = {
    content: null,
    hash: null
  };
  const uploaded = [];
  try {
    metadata = JSON.parse(contract.metadata);
  } catch (e) {
    throw new Error(e);
  }
  if (metadata === undefined) {
    throw new Error('No metadata');
  }
  await Promise.all(Object.keys(metadata.sources).map(fileName => {
    return new Promise((resolve, reject) => {
      // find hash
      let hash = null;
      try {
        // we try extract the hash defined in the metadata.json
        // in order to check if the hash that we get after publishing is the same as the one located in metadata.json
        // if it's not the same, we throw "hash mismatch between solidity bytecode and uploaded content"
        // if we don't find the hash in the metadata.json, the check is not done.
        //
        // TODO: refactor this with publishOnIpfs
        if (metadata.sources[fileName].urls) {
          metadata.sources[fileName].urls.forEach(url => {
            if (url.includes('bzz')) hash = url.match('bzz-raw://(.+)')[1];
          });
        }
      } catch (e) {
        return reject(new Error('Error while extracting the hash from metadata.json'));
      }
      api.readFile(fileName).then(content => {
        sources.push({
          content: content,
          hash: hash,
          filename: fileName
        });
        resolve({
          content: content,
          hash: hash,
          filename: fileName
        });
      }).catch(error => {
        console.log(error);
        reject(error);
      });
    });
  }));

  // the list of nodes to publish to
  const beeNodes = [publicBeeNode];

  // add custom private Bee node to the list
  const postageStampId = api.config.get('settings/swarm-postage-stamp-id') || defaultPostageStampId;
  const privateBeeAddress = api.config.get('settings/swarm-private-bee-address');
  if (privateBeeAddress) {
    const privateBee = new _beeJs.Bee(privateBeeAddress);
    beeNodes.push(privateBee);
  }

  // publish the list of sources in order, fail if any failed
  await Promise.all(sources.map(async item => {
    try {
      const result = await swarmVerifiedPublish(beeNodes, postageStampId, item.content, item.hash, api);
      try {
        item.hash = result.url.match('bzz-raw://(.+)')[1];
      } catch (e) {
        item.hash = '<Metadata inconsistency> - ' + item.fileName;
      }
      item.output = result;
      uploaded.push(item);
      // TODO this is a fix cause Solidity metadata does not contain the right swarm hash (poc 0.3)
      metadata.sources[item.filename].urls[0] = result.url;
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }));
  const metadataContent = JSON.stringify(metadata, null, '\t');
  try {
    const result = await swarmVerifiedPublish(beeNodes, postageStampId, metadataContent, '', api);
    try {
      contract.metadataHash = result.url.match('bzz-raw://(.+)')[1];
    } catch (e) {
      contract.metadataHash = '<Metadata inconsistency> - metadata.json';
    }
    item.content = metadataContent;
    item.hash = contract.metadataHash;
    uploaded.push({
      content: contract.metadata,
      hash: contract.metadataHash,
      filename: 'metadata.json',
      output: result
    });
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
  return {
    uploaded,
    item
  };
};
exports.publishToSwarm = publishToSwarm;
const swarmVerifiedPublish = async (beeNodes, postageStampId, content, expectedHash, api) => {
  try {
    const results = await uploadToBeeNodes(beeNodes, postageStampId, content);
    const hash = hashFromResults(results);
    if (expectedHash && hash !== expectedHash) {
      return {
        message: 'hash mismatch between solidity bytecode and uploaded content.',
        url: 'bzz-raw://' + hash,
        hash
      };
    } else {
      api.writeFile('swarm/' + hash, content);
      return {
        message: 'ok',
        url: 'bzz-raw://' + hash,
        hash
      };
    }
  } catch (error) {
    throw new Error(error);
  }
};
const hashFromResults = results => {
  for (const result of results) {
    if (result != null) {
      return result.reference;
    }
  }
  throw new Error('no result');
};
const uploadToBee = async (bee, postageStampId, content) => {
  try {
    if (bee.url === publicBeeNode.url) {
      postageStampId = defaultPostageStampId;
    }
    return await bee.uploadData(postageStampId, content);
  } catch (_unused) {
    // ignore errors for now
    return null;
  }
};
const uploadToBeeNodes = (beeNodes, postageBatchId, content) => {
  return Promise.all(beeNodes.map(node => uploadToBee(node, postageBatchId, content)));
};

/***/ }),

/***/ "../../../libs/remix-ui/publish-to-storage/src/lib/publishToIPFS.tsx":
/*!**********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/publish-to-storage/src/lib/publishToIPFS.tsx ***!
  \**********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {

var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.publishToIPFS = void 0;
var _ipfsHttpClient = _interopRequireDefault(__webpack_require__(/*! ipfs-http-client */ "../../../node_modules/ipfs-http-client/src/index.js"));
let ipfsNodes = [];
const publishToIPFS = async (contract, api) => {
  ipfsNodes = [(0, _ipfsHttpClient.default)({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https'
  })];
  if (api.config.get('settings/ipfs-url')) {
    const auth = api.config.get('settings/ipfs-project-id') ? 'Basic ' + Buffer.from(api.config.get('settings/ipfs-project-id') + ':' + api.config.get('settings/ipfs-project-secret')).toString('base64') : null;
    const ipfs = (0, _ipfsHttpClient.default)({
      host: api.config.get('settings/ipfs-url'),
      port: api.config.get('settings/ipfs-port'),
      protocol: api.config.get('settings/ipfs-protocol'),
      headers: {
        Authorization: auth
      }
    });
    ipfsNodes.push(ipfs);
  }

  // gather list of files to publish
  const sources = [];
  let metadata;
  const item = {
    content: null,
    hash: null
  };
  const uploaded = [];
  try {
    metadata = JSON.parse(contract.metadata);
  } catch (e) {
    throw new Error(e);
  }
  if (metadata === undefined) {
    throw new Error('No metadata');
  }
  await Promise.all(Object.keys(metadata.sources).map(fileName => {
    return new Promise((resolve, reject) => {
      // find hash
      let hash = null;
      try {
        // we try extract the hash defined in the metadata.json
        // in order to check if the hash that we get after publishing is the same as the one located in metadata.json
        // if it's not the same, we throw "hash mismatch between solidity bytecode and uploaded content"
        // if we don't find the hash in the metadata.json, the check is not done.
        //
        // TODO: refactor this with publishOnSwarm
        if (metadata.sources[fileName].urls) {
          metadata.sources[fileName].urls.forEach(url => {
            if (url.includes('ipfs')) hash = url.match('dweb:/ipfs/(.+)')[1];
          });
        }
      } catch (e) {
        return reject(new Error('Error while extracting the hash from metadata.json'));
      }
      api.readFile(fileName).then(content => {
        sources.push({
          content: content,
          hash: hash,
          filename: fileName
        });
        resolve({
          content: content,
          hash: hash,
          filename: fileName
        });
      }).catch(error => {
        console.log(error);
        reject(error);
      });
    });
  }));
  // publish the list of sources in order, fail if any failed
  await Promise.all(sources.map(async item => {
    try {
      const result = await ipfsVerifiedPublish(item.content, item.hash, api);
      try {
        item.hash = result.url.match('dweb:/ipfs/(.+)')[1];
      } catch (e) {
        item.hash = '<Metadata inconsistency> - ' + item.fileName;
      }
      item.output = result;
      uploaded.push(item);
    } catch (error) {
      throw new Error(error);
    }
  }));
  const metadataContent = JSON.stringify(metadata, null, '\t');
  try {
    const result = await ipfsVerifiedPublish(metadataContent, '', api);
    try {
      contract.metadataHash = result.url.match('dweb:/ipfs/(.+)')[1];
    } catch (e) {
      contract.metadataHash = '<Metadata inconsistency> - metadata.json';
    }
    item.content = metadataContent;
    item.hash = contract.metadataHash;
    uploaded.push({
      content: contract.metadata,
      hash: contract.metadataHash,
      filename: 'metadata.json',
      output: result
    });
  } catch (error) {
    throw new Error(error);
  }
  return {
    uploaded,
    item
  };
};
exports.publishToIPFS = publishToIPFS;
const ipfsVerifiedPublish = async (content, expectedHash, api) => {
  try {
    const results = await severalGatewaysPush(content);
    const hash = results.path;
    if (expectedHash && hash !== expectedHash) {
      return {
        message: 'hash mismatch between solidity bytecode and uploaded content.',
        url: 'dweb:/ipfs/' + hash,
        hash
      };
    } else {
      api.writeFile('ipfs/' + hash, content);
      return {
        message: 'ok',
        url: 'dweb:/ipfs/' + hash,
        hash
      };
    }
  } catch (error) {
    throw new Error(error);
  }
};
const severalGatewaysPush = content => {
  const invert = p => new Promise((resolve, reject) => p.then(reject).catch(resolve)); // Invert res and rej
  const promises = ipfsNodes.map(node => invert(node.add(content)));
  return invert(Promise.all(promises));
};
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../../node_modules/node-libs-browser/node_modules/buffer/index.js */ "../../../node_modules/node-libs-browser/node_modules/buffer/index.js").Buffer))

/***/ }),

/***/ "../../../libs/remix-ui/renderer/src/index.ts":
/*!***********************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/renderer/src/index.ts ***!
  \***********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _renderer = __webpack_require__(/*! ./lib/renderer */ "../../../libs/remix-ui/renderer/src/lib/renderer.tsx");
Object.keys(_renderer).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _renderer[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _renderer[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/renderer/src/lib/renderer.css":
/*!*******************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/renderer/src/lib/renderer.css ***!
  \*******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./renderer.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/renderer/src/lib/renderer.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/renderer/src/lib/renderer.tsx":
/*!*******************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/renderer/src/lib/renderer.tsx ***!
  \*******************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Renderer = void 0;
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _remixSolidity = __webpack_require__(/*! @remix-project/remix-solidity */ "../../../dist/libs/remix-solidity/src/index.js");
__webpack_require__(/*! ./renderer.css */ "../../../libs/remix-ui/renderer/src/lib/renderer.css");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/renderer/src/lib/renderer.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const Renderer = ({
  message,
  opt: _opt = {},
  plugin
}) => {
  const [messageText, setMessageText] = (0, _react.useState)(null);
  const [editorOptions, setEditorOptions] = (0, _react.useState)({
    useSpan: false,
    type: '',
    errFile: ''
  });
  const [classList, setClassList] = (0, _react.useState)(_opt.type === 'error' ? 'alert alert-danger' : 'alert alert-warning');
  const [close, setClose] = (0, _react.useState)(false);
  (0, _react.useEffect)(() => {
    if (!message) return;
    let text;
    if (typeof message === 'string') {
      text = message;
    } else if (message.innerText) {
      text = message.innerText;
    }

    // ^ e.g:
    // browser/gm.sol: Warning: Source file does not specify required compiler version! Consider adding "pragma solidity ^0.6.12
    // https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v3.2.0/contracts/introspection/IERC1820Registry.sol:3:1: ParserError: Source file requires different compiler version (current compiler is 0.7.4+commit.3f05b770.Emscripten.clang) - note that nightly builds are considered to be strictly less than the released version
    const positionDetails = _remixSolidity.helper.getPositionDetails(text);
    _opt.errLine = positionDetails.errLine;
    _opt.errCol = positionDetails.errCol;
    _opt.errFile = positionDetails.errFile ? positionDetails.errFile.trim() : '';
    setMessageText(text);
    setEditorOptions(_opt);
    setClose(false);
    setClassList(_opt.type === 'error' ? 'alert alert-danger' : 'alert alert-warning');
  }, [message, _opt]);
  const handleErrorClick = opt => {
    if (opt.click) {
      opt.click(message);
    } else if (opt.errFile !== undefined && opt.errLine !== undefined && opt.errCol !== undefined) {
      _errorClick(opt.errFile, opt.errLine, opt.errCol);
    }
  };
  const handleClose = () => {
    setClose(true);
  };
  const _errorClick = async (errFile, errLine, errCol) => {
    if (errFile !== (await plugin.call('config', 'getAppParameter', 'currentFile'))) {
      // TODO: refactor with this._components.contextView.jumpTo
      if (await plugin.call('fileManager', 'exists', errFile)) {
        await plugin.call('fileManager', 'open', errFile);
        await plugin.call('editor', 'gotoLine', errLine, errCol);
      }
    } else {
      await plugin.call('editor', 'gotoLine', errLine, errCol);
    }
  };
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
    children: messageText && !close && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      className: `remixui_sol ${editorOptions.type} ${classList}`,
      "data-id": editorOptions.errFile,
      onClick: () => handleErrorClick(editorOptions),
      children: [editorOptions.useSpan ? /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
        children: [" ", messageText, " "]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 76,
        columnNumber: 39
      }, void 0) : /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("pre", {
        children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
          children: messageText
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 76,
          columnNumber: 77
        }, void 0)
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 76,
        columnNumber: 72
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: "close",
        "data-id": "renderer",
        onClick: handleClose,
        children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
          className: "fas fa-times"
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 78,
          columnNumber: 15
        }, void 0)
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 77,
        columnNumber: 13
      }, void 0)]
    }, void 0, true, {
      fileName: _jsxFileName,
      lineNumber: 75,
      columnNumber: 11
    }, void 0)
  }, void 0, false);
};
exports.Renderer = Renderer;

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/index.ts":
/*!********************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/index.ts ***!
  \********************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _solidityCompiler = __webpack_require__(/*! ./lib/solidity-compiler */ "../../../libs/remix-ui/solidity-compiler/src/lib/solidity-compiler.tsx");
Object.keys(_solidityCompiler).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _solidityCompiler[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _solidityCompiler[key];
    }
  });
});
var _logic = __webpack_require__(/*! ./lib/logic */ "../../../libs/remix-ui/solidity-compiler/src/lib/logic/index.ts");
Object.keys(_logic).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _logic[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _logic[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/actions/compiler.ts":
/*!***********************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/actions/compiler.ts ***!
  \***********************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setEditorMode = exports.setCompilerMode = exports.resetEditorMode = exports.resetCompilerMode = exports.listenToEvents = void 0;
const setEditorMode = mode => {
  return {
    type: 'SET_EDITOR_MODE',
    payload: mode
  };
};
exports.setEditorMode = setEditorMode;
const resetEditorMode = () => dispatch => {
  dispatch({
    type: 'RESET_EDITOR_MODE'
  });
};
exports.resetEditorMode = resetEditorMode;
const setCompilerMode = (mode, ...args) => {
  return {
    type: 'SET_COMPILER_MODE',
    payload: {
      mode,
      args
    }
  };
};
exports.setCompilerMode = setCompilerMode;
const resetCompilerMode = () => dispatch => {
  dispatch({
    type: 'RESET_COMPILER_MODE'
  });
};
exports.resetCompilerMode = resetCompilerMode;
const listenToEvents = (compileTabLogic, api) => dispatch => {
  api.onSessionSwitched = () => {
    dispatch(setEditorMode('sessionSwitched'));
  };
  compileTabLogic.event.on('startingCompilation', () => {
    dispatch(setCompilerMode('startingCompilation'));
  });
  compileTabLogic.compiler.event.register('compilationDuration', speed => {
    dispatch(setCompilerMode('compilationDuration', speed));
  });
  api.onContentChanged = () => {
    dispatch(setEditorMode('contentChanged'));
  };
  compileTabLogic.compiler.event.register('loadingCompiler', () => {
    dispatch(setCompilerMode('loadingCompiler'));
  });
  compileTabLogic.compiler.event.register('compilerLoaded', (version, license) => {
    dispatch(setCompilerMode('compilerLoaded', version, license));
  });
  compileTabLogic.compiler.event.register('compilationFinished', (success, data, source, input, version) => {
    dispatch(setCompilerMode('compilationFinished', success, data, source, input, version));
  });
};
exports.listenToEvents = listenToEvents;

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/compiler-container.tsx":
/*!**************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/compiler-container.tsx ***!
  \**************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {

var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.CompilerContainer = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _reactIntl = __webpack_require__(/*! react-intl */ "../../../node_modules/react-intl/lib/index.js");
var _semver = _interopRequireDefault(__webpack_require__(/*! semver */ "../../../node_modules/@nrwl/web/node_modules/semver/index.js"));
var _helper = __webpack_require__(/*! @remix-ui/helper */ "../../../libs/remix-ui/helper/src/index.ts");
var _remixSolidity = __webpack_require__(/*! @remix-project/remix-solidity */ "../../../dist/libs/remix-solidity/src/index.js");
var _compiler = __webpack_require__(/*! ./reducers/compiler */ "../../../libs/remix-ui/solidity-compiler/src/lib/reducers/compiler.ts");
var _compiler2 = __webpack_require__(/*! ./actions/compiler */ "../../../libs/remix-ui/solidity-compiler/src/lib/actions/compiler.ts");
var _clipboard = __webpack_require__(/*! @remix-ui/clipboard */ "../../../libs/remix-ui/clipboard/src/index.ts");
var _compilerConfiguration = __webpack_require__(/*! ./compilerConfiguration */ "../../../libs/remix-ui/solidity-compiler/src/lib/compilerConfiguration.tsx");
__webpack_require__(/*! ./css/style.css */ "../../../libs/remix-ui/solidity-compiler/src/lib/css/style.css");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/compiler-container.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const defaultPath = "compiler_config.json";
const _paq = window._paq = window._paq || []; //eslint-disable-line

const CompilerContainer = props => {
  const {
    api,
    compileTabLogic,
    tooltip,
    modal,
    compiledFileName,
    updateCurrentVersion,
    configurationSettings,
    isHardhatProject,
    isTruffleProject,
    isFoundryProject,
    workspaceName,
    configFilePath,
    setConfigFilePath
  } = props; // eslint-disable-line
  const [state, setState] = (0, _react.useState)({
    hideWarnings: false,
    autoCompile: false,
    useFileConfiguration: false,
    matomoAutocompileOnce: true,
    optimize: false,
    compileTimeout: null,
    timeout: 300,
    allversions: [],
    customVersions: [],
    compilerLicense: null,
    selectedVersion: null,
    defaultVersion: 'soljson-v0.8.7+commit.e28d00a7.js',
    // this default version is defined: in makeMockCompiler (for browser test)
    runs: '',
    compiledFileName: '',
    includeNightlies: false,
    language: 'Solidity',
    evmVersion: '',
    createFileOnce: true
  });
  const [showFilePathInput, setShowFilePathInput] = (0, _react.useState)(false);
  const [toggleExpander, setToggleExpander] = (0, _react.useState)(false);
  const [disableCompileButton, setDisableCompileButton] = (0, _react.useState)(false);
  const compileIcon = (0, _react.useRef)(null);
  const promptMessageInput = (0, _react.useRef)(null);
  const configFilePathInput = (0, _react.useRef)(null);
  const [hhCompilation, sethhCompilation] = (0, _react.useState)(false);
  const [truffleCompilation, setTruffleCompilation] = (0, _react.useState)(false);
  const [compilerContainer, dispatch] = (0, _react.useReducer)(_compiler.compilerReducer, _compiler.compilerInitialState);
  const intl = (0, _reactIntl.useIntl)();
  (0, _react.useEffect)(() => {
    if (workspaceName) {
      api.setAppParameter('configFilePath', defaultPath);
      if (state.useFileConfiguration) {
        api.fileExists(defaultPath).then(exists => {
          if (!exists && state.useFileConfiguration) {
            configFilePathInput.current.value = defaultPath;
            createNewConfigFile();
          }
        });
      }
      setShowFilePathInput(false);
    }
  }, [workspaceName]);
  (0, _react.useEffect)(() => {
    if (state.useFileConfiguration) {
      api.fileExists(defaultPath).then(exists => {
        if (!exists) createNewConfigFile();
      });
      setToggleExpander(true);
    }
  }, [state.useFileConfiguration]);
  (0, _react.useEffect)(() => {
    const listener = event => {
      if (configFilePathInput.current !== event.target && event.target.innerText !== "Create") {
        setShowFilePathInput(false);
        configFilePathInput.current.value = "";
        return;
      }
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  });
  (0, _react.useEffect)(() => {
    fetchAllVersion((allversions, selectedVersion, isURL) => {
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          allversions
        });
      });
      if (isURL) _updateVersionSelector(state.defaultVersion, selectedVersion);else {
        setState(prevState => {
          return _objectSpread(_objectSpread({}, prevState), {}, {
            selectedVersion
          });
        });
        updateCurrentVersion(selectedVersion);
        _updateVersionSelector(selectedVersion);
      }
    });
    const currentFileName = api.currentFile;
    currentFile(currentFileName);
    (0, _compiler2.listenToEvents)(compileTabLogic, api)(dispatch);
  }, []);
  (0, _react.useEffect)(() => {
    (async () => {
      if (compileTabLogic && compileTabLogic.compiler) {
        const autocompile = (await api.getAppParameter('autoCompile')) || false;
        const hideWarnings = (await api.getAppParameter('hideWarnings')) || false;
        const includeNightlies = (await api.getAppParameter('includeNightlies')) || false;
        const useFileConfiguration = (await api.getAppParameter('useFileConfiguration')) || false;
        let configFilePathSaved = await api.getAppParameter('configFilePath');
        if (!configFilePathSaved || configFilePathSaved == '') configFilePathSaved = defaultPath;
        setConfigFilePath(configFilePathSaved);
        setState(prevState => {
          const params = api.getCompilerParameters();
          const optimize = params.optimize;
          const runs = params.runs;
          const evmVersion = compileTabLogic.evmVersions.includes(params.evmVersion) ? params.evmVersion : 'default';
          const language = (0, _remixSolidity.getValidLanguage)(params.language);
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hideWarnings: hideWarnings,
            autoCompile: autocompile,
            includeNightlies: includeNightlies,
            useFileConfiguration: useFileConfiguration,
            optimize: optimize,
            runs: runs,
            evmVersion: evmVersion !== null && evmVersion !== 'null' && evmVersion !== undefined && evmVersion !== 'undefined' ? evmVersion : 'default',
            language: language !== null ? language : 'Solidity'
          });
        });
      }
    })();
  }, [compileTabLogic]);
  (0, _react.useEffect)(() => {
    const isDisabled = !compiledFileName || compiledFileName && !isSolFileSelected(compiledFileName);
    setDisableCompileButton(isDisabled);
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        compiledFileName
      });
    });
  }, [compiledFileName]);
  (0, _react.useEffect)(() => {
    if (compilerContainer.compiler.mode) {
      switch (compilerContainer.compiler.mode) {
        case 'startingCompilation':
          startingCompilation();
          break;
        case 'compilationDuration':
          compilationDuration(compilerContainer.compiler.args[0]);
          break;
        case 'loadingCompiler':
          loadingCompiler();
          break;
        case 'compilerLoaded':
          compilerLoaded(compilerContainer.compiler.args[1]);
          break;
        case 'compilationFinished':
          compilationFinished();
          break;
      }
    }
  }, [compilerContainer.compiler.mode]);
  (0, _react.useEffect)(() => {
    if (compilerContainer.editor.mode) {
      switch (compilerContainer.editor.mode) {
        case 'sessionSwitched':
          sessionSwitched();
          (0, _compiler2.resetEditorMode)()(dispatch);
          break;
        case 'contentChanged':
          contentChanged();
          (0, _compiler2.resetEditorMode)()(dispatch);
          break;
      }
    }
  }, [compilerContainer.editor.mode]);
  (0, _react.useEffect)(() => {
    compileTabLogic.setUseFileConfiguration(state.useFileConfiguration);
    if (state.useFileConfiguration) compileTabLogic.setConfigFilePath(configFilePath);
  }, [state.useFileConfiguration]);
  (0, _react.useEffect)(() => {
    if (configurationSettings) {
      setConfiguration(configurationSettings);
    }
  }, [configurationSettings]);
  const toggleConfigType = () => {
    if (state.useFileConfiguration) if (state.createFileOnce) {
      api.fileExists(defaultPath).then(exists => {
        if (!exists || state.useFileConfiguration) createNewConfigFile();
      });
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          createFileOnce: false
        });
      });
    }
    setState(prevState => {
      api.setAppParameter('useFileConfiguration', !state.useFileConfiguration);
      return _objectSpread(_objectSpread({}, prevState), {}, {
        useFileConfiguration: !state.useFileConfiguration
      });
    });
  };
  const openFile = async () => {
    await api.open(configFilePath);
  };
  const createNewConfigFile = async () => {
    let filePath = configFilePathInput.current && configFilePathInput.current.value !== '' ? configFilePathInput.current.value : configFilePath;
    if (filePath === '') filePath = defaultPath;
    if (!filePath.endsWith('.json')) filePath = filePath + '.json';
    let compilerConfig = _compilerConfiguration.configFileContent;
    if (isFoundryProject && !compilerConfig.includes('remappings')) {
      const config = JSON.parse(compilerConfig);
      config.settings.remappings = ['ds-test/=lib/forge-std/lib/ds-test/src/', 'forge-std/=lib/forge-std/src/'];
      compilerConfig = JSON.stringify(config, null, '\t');
    }
    await api.writeFile(filePath, compilerConfig);
    api.setAppParameter('configFilePath', filePath);
    setConfigFilePath(filePath);
    compileTabLogic.setConfigFilePath(filePath);
    setShowFilePathInput(false);
  };
  const handleConfigPathChange = async () => {
    if (configFilePathInput.current.value !== '') {
      if (!configFilePathInput.current.value.endsWith('.json')) configFilePathInput.current.value += '.json';
      if (await api.fileExists(configFilePathInput.current.value)) {
        api.setAppParameter('configFilePath', configFilePathInput.current.value);
        setConfigFilePath(configFilePathInput.current.value);
        compileTabLogic.setConfigFilePath(configFilePathInput.current.value);
        setShowFilePathInput(false);
      } else {
        modal('New configuration file', `The file "${configFilePathInput.current.value}" you entered does not exist. Do you want to create a new one?`, 'Create', async () => await createNewConfigFile(), 'Cancel', () => {
          setShowFilePathInput(false);
        });
      }
    }
  };
  const _retrieveVersion = version => {
    if (!version) version = state.selectedVersion;
    if (version === 'builtin') version = state.defaultVersion;
    return _semver.default.coerce(version) ? _semver.default.coerce(version).version : '';
  };

  // fetching both normal and wasm builds and creating a [version, baseUrl] map
  const fetchAllVersion = async callback => {
    let selectedVersion, allVersionsWasm, isURL;
    let allVersions = [{
      path: 'builtin',
      longVersion: 'latest local version - ' + state.defaultVersion
    }];
    // fetch normal builds
    const binRes = await (0, _remixSolidity.promisedMiniXhr)(`${_remixSolidity.baseURLBin}/list.json`);
    // fetch wasm builds
    const wasmRes = await (0, _remixSolidity.promisedMiniXhr)(`${_remixSolidity.baseURLWasm}/list.json`);
    if (binRes.event.type === 'error' && wasmRes.event.type === 'error') {
      selectedVersion = 'builtin';
      return callback(allVersions, selectedVersion);
    }
    try {
      const versions = JSON.parse(binRes.json).builds.slice().reverse();
      allVersions = [...allVersions, ...versions];
      selectedVersion = state.defaultVersion;
      if (api.getCompilerParameters().version) {
        const versionFromURL = api.getCompilerParameters().version;
        // Check if version is a URL and corresponding filename starts with 'soljson'
        if (versionFromURL.startsWith('https://')) {
          const urlArr = versionFromURL.split('/');
          if (urlArr[urlArr.length - 1].startsWith('soljson')) {
            isURL = true;
            selectedVersion = versionFromURL;
          }
        } else {
          // URL version can be like 0.8.7+commit.e28d00a7, 0.8.7 or soljson-v0.8.7+commit.e28d00a7.js
          const selectedVersionArr = versions.filter(obj => obj.path === versionFromURL || obj.longVersion === versionFromURL || obj.version === versionFromURL);
          // for version like 0.8.15, there will be more than one elements in the array
          // In that case too, index 0 will have non-nightly version object
          if (selectedVersionArr.length) selectedVersion = selectedVersionArr[0].path;
        }
      }
      if (wasmRes.event.type !== 'error') {
        allVersionsWasm = JSON.parse(wasmRes.json).builds.slice().reverse();
      }
    } catch (e) {
      tooltip('Cannot load compiler version list. It might have been blocked by an advertisement blocker. Please try deactivating any of them from this page and reload. Error: ' + e);
    }
    // replace in allVersions those compiler builds which exist in allVersionsWasm with new once
    if (allVersionsWasm && allVersions) {
      allVersions.forEach((compiler, index) => {
        const wasmIndex = allVersionsWasm.findIndex(wasmCompiler => {
          return wasmCompiler.longVersion === compiler.longVersion;
        });
        const URLWasm = process && Object({"NODE_ENV":"development","NX_CLI_SET":"true","NX_TASK_HASH":"cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_INVOKED_BY_RUNNER":"true","NX_WORKSPACE_ROOT":"/Users/ovi/Desktop/micovi/remix-project","NX_TERMINAL_OUTPUT_PATH":"/Users/ovi/Desktop/micovi/remix-project/node_modules/.cache/nx/terminalOutputs/cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_FORWARD_OUTPUT":"true"}) && Object({"NODE_ENV":"development","NX_CLI_SET":"true","NX_TASK_HASH":"cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_INVOKED_BY_RUNNER":"true","NX_WORKSPACE_ROOT":"/Users/ovi/Desktop/micovi/remix-project","NX_TERMINAL_OUTPUT_PATH":"/Users/ovi/Desktop/micovi/remix-project/node_modules/.cache/nx/terminalOutputs/cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_FORWARD_OUTPUT":"true"})['NX_WASM_URL'] ? Object({"NODE_ENV":"development","NX_CLI_SET":"true","NX_TASK_HASH":"cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_INVOKED_BY_RUNNER":"true","NX_WORKSPACE_ROOT":"/Users/ovi/Desktop/micovi/remix-project","NX_TERMINAL_OUTPUT_PATH":"/Users/ovi/Desktop/micovi/remix-project/node_modules/.cache/nx/terminalOutputs/cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_FORWARD_OUTPUT":"true"})['NX_WASM_URL'] : _remixSolidity.baseURLWasm;
        const URLBin = process && Object({"NODE_ENV":"development","NX_CLI_SET":"true","NX_TASK_HASH":"cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_INVOKED_BY_RUNNER":"true","NX_WORKSPACE_ROOT":"/Users/ovi/Desktop/micovi/remix-project","NX_TERMINAL_OUTPUT_PATH":"/Users/ovi/Desktop/micovi/remix-project/node_modules/.cache/nx/terminalOutputs/cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_FORWARD_OUTPUT":"true"}) && Object({"NODE_ENV":"development","NX_CLI_SET":"true","NX_TASK_HASH":"cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_INVOKED_BY_RUNNER":"true","NX_WORKSPACE_ROOT":"/Users/ovi/Desktop/micovi/remix-project","NX_TERMINAL_OUTPUT_PATH":"/Users/ovi/Desktop/micovi/remix-project/node_modules/.cache/nx/terminalOutputs/cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_FORWARD_OUTPUT":"true"})['NX_BIN_URL'] ? Object({"NODE_ENV":"development","NX_CLI_SET":"true","NX_TASK_HASH":"cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_INVOKED_BY_RUNNER":"true","NX_WORKSPACE_ROOT":"/Users/ovi/Desktop/micovi/remix-project","NX_TERMINAL_OUTPUT_PATH":"/Users/ovi/Desktop/micovi/remix-project/node_modules/.cache/nx/terminalOutputs/cfc9acc842e673b1348d99021ef32a9882f204b6a0ef59c6dc0898c3fd6801a3","NX_FORWARD_OUTPUT":"true"})['NX_BIN_URL'] : _remixSolidity.baseURLBin;
        if (wasmIndex !== -1) {
          allVersions[index] = allVersionsWasm[wasmIndex];
          _remixSolidity.pathToURL[compiler.path] = URLWasm;
        } else {
          _remixSolidity.pathToURL[compiler.path] = URLBin;
        }
      });
    }
    callback(allVersions, selectedVersion, isURL);
  };

  /**
   * Update the compilation button with the name of the current file
   */
  const currentFile = (name = '') => {
    if (name && name !== '') {
      _setCompilerVersionFromPragma(name);
    }
    const compiledFileName = name.split('/').pop();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        compiledFileName
      });
    });
  };

  // Load solc compiler version according to pragma in contract file
  const _setCompilerVersionFromPragma = filename => {
    if (!state.allversions) return;
    api.readFile(filename).then(data => {
      if (!data) return;
      const pragmaArr = data.match(/(pragma solidity (.+?);)/g);
      if (pragmaArr && pragmaArr.length === 1) {
        const pragmaStr = pragmaArr[0].replace('pragma solidity', '').trim();
        const pragma = pragmaStr.substring(0, pragmaStr.length - 1);
        const releasedVersions = state.allversions.filter(obj => !obj.prerelease).map(obj => obj.version);
        const allVersions = state.allversions.map(obj => _retrieveVersion(obj.version));
        const currentCompilerName = _retrieveVersion(state.selectedVersion);
        // contains only numbers part, for example '0.4.22'
        const pureVersion = _retrieveVersion();
        // is nightly build newer than the last release
        const isNewestNightly = currentCompilerName.includes('nightly') && _semver.default.gt(pureVersion, releasedVersions[0]);
        // checking if the selected version is in the pragma range
        const isInRange = _semver.default.satisfies(pureVersion, pragma);
        // checking if the selected version is from official compilers list(excluding custom versions) and in range or greater
        const isOfficial = allVersions.includes(currentCompilerName);
        if (isOfficial && !isInRange && !isNewestNightly) {
          const compilerToLoad = _semver.default.maxSatisfying(releasedVersions, pragma);
          const compilerPath = state.allversions.filter(obj => !obj.prerelease && obj.version === compilerToLoad)[0].path;
          if (state.selectedVersion !== compilerPath) {
            // @ts-ignore
            api.call('notification', 'toast', `Updating compiler version to match current contract file pragma i.e ${_retrieveVersion(compilerPath)}`);
            setState(prevState => {
              return _objectSpread(_objectSpread({}, prevState), {}, {
                selectedVersion: compilerPath
              });
            });
            _updateVersionSelector(compilerPath);
          }
        }
      }
    });
  };
  const isSolFileSelected = (currentFile = '') => {
    if (!currentFile) currentFile = api.currentFile;
    if (!currentFile) return false;
    const extention = currentFile.substr(currentFile.length - 3, currentFile.length);
    return extention.toLowerCase() === 'sol' || extention.toLowerCase() === 'yul';
  };
  const sessionSwitched = () => {
    if (!compileIcon.current) return;
    scheduleCompilation();
  };
  const startingCompilation = () => {
    if (!compileIcon.current) return;
    compileIcon.current.setAttribute('title', 'compiling...');
    compileIcon.current.classList.remove('remixui_bouncingIcon');
    compileIcon.current.classList.add('remixui_spinningIcon');
  };
  const compilationDuration = speed => {
    if (speed > 1000) {
      console.log(`Last compilation took ${speed}ms. We suggest to turn off autocompilation.`);
    }
  };
  const contentChanged = () => {
    if (!compileIcon.current) return;
    scheduleCompilation();
    compileIcon.current.classList.add('remixui_bouncingIcon'); // @TODO: compileView tab
  };

  const loadingCompiler = () => {
    if (!compileIcon.current) return;
    compileIcon.current.setAttribute('title', 'compiler is loading, please wait a few moments.');
    compileIcon.current.classList.add('remixui_spinningIcon');
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        compilerLicense: 'Compiler is loading. License will be displayed once compiler is loaded'
      });
    });
    _updateLanguageSelector();
    setDisableCompileButton(true);
  };
  const compilerLoaded = license => {
    if (!compileIcon.current) return;
    compileIcon.current.setAttribute('title', '');
    compileIcon.current.classList.remove('remixui_spinningIcon');
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        compilerLicense: license ? license : 'Could not retreive license for selected compiler version'
      });
    });
    if (state.autoCompile) compile();
    const isDisabled = !compiledFileName || compiledFileName && !isSolFileSelected(compiledFileName);
    setDisableCompileButton(isDisabled);

    // just for e2e
    // eslint-disable-next-line no-case-declarations
    const elements = document.querySelectorAll('[data-id="compilerloaded"]');
    // remove elements
    for (let i = 0; i < elements.length; i++) {
      elements[i].remove();
    }
    const loadedElement = document.createElement('span');
    loadedElement.setAttribute('data-id', 'compilerloaded');
    loadedElement.setAttribute('data-version', state.selectedVersion);
    document.body.appendChild(loadedElement);
  };
  const compilationFinished = () => {
    if (!compileIcon.current) return;
    compileIcon.current.setAttribute('title', 'idle');
    compileIcon.current.classList.remove('remixui_spinningIcon');
    compileIcon.current.classList.remove('remixui_bouncingIcon');
    if (!state.autoCompile || state.autoCompile && state.matomoAutocompileOnce) {
      _paq.push(['trackEvent', 'compiler', 'compiled', 'with_config_file_' + state.useFileConfiguration]);
      _paq.push(['trackEvent', 'compiler', 'compiled', 'with_version_' + _retrieveVersion()]);
      if (state.autoCompile && state.matomoAutocompileOnce) {
        setState(prevState => {
          return _objectSpread(_objectSpread({}, prevState), {}, {
            matomoAutocompileOnce: false
          });
        });
      }
    }
  };
  const scheduleCompilation = () => {
    if (!state.autoCompile) return;
    if (state.compileTimeout) window.clearTimeout(state.compileTimeout);
    const compileTimeout = window.setTimeout(() => {
      state.autoCompile && compile();
    }, state.timeout);
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        compileTimeout
      });
    });
  };
  const compile = () => {
    const currentFile = api.currentFile;
    if (!isSolFileSelected()) return;
    _setCompilerVersionFromPragma(currentFile);
    let externalCompType;
    if (hhCompilation) externalCompType = 'hardhat';else if (truffleCompilation) externalCompType = 'truffle';
    compileTabLogic.runCompiler(externalCompType);
  };
  const compileAndRun = () => {
    const currentFile = api.currentFile;
    if (!isSolFileSelected()) return;
    _setCompilerVersionFromPragma(currentFile);
    let externalCompType;
    if (hhCompilation) externalCompType = 'hardhat';else if (truffleCompilation) externalCompType = 'truffle';
    api.runScriptAfterCompilation(currentFile);
    compileTabLogic.runCompiler(externalCompType);
  };
  const _updateVersionSelector = (version, customUrl = '') => {
    // update selectedversion of previous one got filtered out
    let selectedVersion = version;
    if (!selectedVersion || !_shouldBeAdded(selectedVersion)) {
      selectedVersion = state.defaultVersion;
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          selectedVersion
        });
      });
    }
    updateCurrentVersion(selectedVersion);
    api.setCompilerParameters({
      version: selectedVersion
    });
    let url;
    if (customUrl !== '') {
      selectedVersion = customUrl;
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          selectedVersion,
          customVersions: [...state.customVersions, selectedVersion]
        });
      });
      updateCurrentVersion(selectedVersion);
      url = customUrl;
      api.setCompilerParameters({
        version: selectedVersion
      });
    } else {
      if ((0, _helper.checkSpecialChars)(selectedVersion)) {
        return console.log('loading ' + selectedVersion + ' not allowed, special chars not allowed.');
      }
      if (selectedVersion === 'builtin' || selectedVersion.indexOf('soljson') === 0) {
        url = (0, _remixSolidity.urlFromVersion)(selectedVersion);
      } else {
        return console.log('loading ' + selectedVersion + ' not allowed, version should start with "soljson"');
      }
    }

    // Workers cannot load js on "file:"-URLs and we get a
    // "Uncaught RangeError: Maximum call stack size exceeded" error on Chromium,
    // resort to non-worker version in that case.
    if (selectedVersion === 'builtin') selectedVersion = state.defaultVersion;
    if (selectedVersion !== 'builtin' && (0, _remixSolidity.canUseWorker)(selectedVersion)) {
      compileTabLogic.compiler.loadVersion(true, url);
    } else {
      compileTabLogic.compiler.loadVersion(false, url);
    }
  };
  const _shouldBeAdded = version => {
    return !version.includes('nightly') || version.includes('nightly') && state.includeNightlies;
  };
  const promptCompiler = () => {
    // custom url https://solidity-blog.s3.eu-central-1.amazonaws.com/data/08preview/soljson.js
    modal(intl.formatMessage({
      id: 'solidity.addACustomCompiler',
      defaultMessage: 'Add a custom compiler'
    }), promptMessage('URL'), 'OK', addCustomCompiler, 'Cancel', () => {});
  };
  const showCompilerLicense = () => {
    modal('Compiler License', state.compilerLicense ? state.compilerLicense : 'License not available', 'OK', () => {});
  };
  const promptMessage = message => {
    return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
      children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
        children: message
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 595,
        columnNumber: 9
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
        type: "text",
        "data-id": "modalDialogCustomPromptCompiler",
        className: "form-control",
        ref: promptMessageInput
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 596,
        columnNumber: 9
      }, void 0)]
    }, void 0, true);
  };
  const addCustomCompiler = () => {
    const url = promptMessageInput.current.value;
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        selectedVersion: url
      });
    });
    _updateVersionSelector(state.defaultVersion, url);
  };
  const handleLoadVersion = value => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        selectedVersion: value,
        matomoAutocompileOnce: true
      });
    });
    updateCurrentVersion(value);
    _updateVersionSelector(value);
    _updateLanguageSelector();
  };
  const _updateLanguageSelector = () => {
    // This is the first version when Yul is available
    if (!_semver.default.valid(_retrieveVersion()) || _semver.default.lt(_retrieveVersion(), 'v0.5.7+commit.6da8b019.js')) {
      handleLanguageChange('Solidity');
      compileTabLogic.setLanguage('Solidity');
    }
  };
  const handleAutoCompile = e => {
    const checked = e.target.checked;
    api.setAppParameter('autoCompile', checked);
    checked && compile();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        autoCompile: checked,
        matomoAutocompileOnce: state.matomoAutocompileOnce || checked
      });
    });
  };
  const handleOptimizeChange = value => {
    const checked = !!value;
    api.setAppParameter('optimize', checked);
    compileTabLogic.setOptimize(checked);
    if (compileTabLogic.optimize) {
      compileTabLogic.setRuns(parseInt(state.runs));
    } else {
      compileTabLogic.setRuns(200);
    }
    state.autoCompile && compile();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        optimize: checked
      });
    });
  };
  const onChangeRuns = value => {
    const runs = value;
    compileTabLogic.setRuns(parseInt(runs));
    state.autoCompile && compile();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        runs
      });
    });
  };
  const handleHideWarningsChange = e => {
    const checked = e.target.checked;
    api.setAppParameter('hideWarnings', checked);
    state.autoCompile && compile();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        hideWarnings: checked
      });
    });
  };
  const handleNightliesChange = e => {
    const checked = e.target.checked;
    if (!checked) handleLoadVersion(state.defaultVersion);
    api.setAppParameter('includeNightlies', checked);
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        includeNightlies: checked
      });
    });
  };
  const handleLanguageChange = value => {
    compileTabLogic.setLanguage(value);
    state.autoCompile && compile();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        language: value
      });
    });
  };
  const handleEvmVersionChange = value => {
    if (!value) return;
    let v = value;
    if (v === 'default') {
      v = null;
    }
    compileTabLogic.setEvmVersion(v);
    state.autoCompile && compile();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        evmVersion: value
      });
    });
  };
  const updatehhCompilation = event => {
    const checked = event.target.checked;
    if (checked) setTruffleCompilation(false); // wayaround to reset the variable
    sethhCompilation(checked);
    api.setAppParameter('hardhat-compilation', checked);
  };
  const updateTruffleCompilation = event => {
    const checked = event.target.checked;
    if (checked) sethhCompilation(false); // wayaround to reset the variable
    setTruffleCompilation(checked);
    api.setAppParameter('truffle-compilation', checked);
  };

  /*
    The following functions map with the above event handlers.
    They are an external API for modifying the compiler configuration.
  */
  const setConfiguration = settings => {
    handleLoadVersion(`soljson-v${settings.version}.js`);
    handleEvmVersionChange(settings.evmVersion);
    handleLanguageChange(settings.language);
    handleOptimizeChange(settings.optimize);
    onChangeRuns(settings.runs);
  };
  const toggleConfigurations = () => {
    setToggleExpander(!toggleExpander);
  };
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("section", {
    children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("article", {
      children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: "pt-0 remixui_compilerSection",
        children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "mb-1",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "remixui_compilerLabel form-check-label",
            htmlFor: "versionSelector",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.compiler",
              defaultMessage: "Compiler"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 740,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 739,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
            placement: "top",
            tooltipId: "promptCompilerTooltip",
            tooltipClasses: "text-nowrap",
            tooltipText: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.addACustomCompilerWithURL",
              defaultMessage: "Add a custom compiler with URL"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 746,
              columnNumber: 28
            }, void 0),
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
              className: "far fa-plus border-0 p-0 ml-3",
              onClick: () => promptCompiler()
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 748,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 742,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
            placement: "top",
            tooltipId: "showCompilerTooltip",
            tooltipClasses: "text-nowrap",
            tooltipText: "See compiler license",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
              className: "fa fa-file-text-o border-0 p-0 ml-2",
              onClick: () => showCompilerLicense()
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 756,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 750,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("select", {
            value: state.selectedVersion || state.defaultVersion,
            onChange: e => handleLoadVersion(e.target.value),
            className: "custom-select",
            id: "versionSelector",
            disabled: state.allversions.length <= 0,
            children: [state.allversions.length <= 0 && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("option", {
              disabled: true,
              "data-id": state.selectedVersion === state.defaultVersion ? 'selected' : '',
              children: state.defaultVersion
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 759,
              columnNumber: 49
            }, void 0), state.allversions.length <= 0 && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("option", {
              disabled: true,
              "data-id": state.selectedVersion === 'builtin' ? 'selected' : '',
              children: "builtin"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 760,
              columnNumber: 49
            }, void 0), state.customVersions.map((url, i) => /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("option", {
              "data-id": state.selectedVersion === url ? 'selected' : '',
              value: url,
              children: "custom"
            }, i, false, {
              fileName: _jsxFileName,
              lineNumber: 761,
              columnNumber: 53
            }, void 0)), state.allversions.map((build, i) => {
              return _shouldBeAdded(build.longVersion) ? /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("option", {
                value: build.path,
                "data-id": state.selectedVersion === build.path ? 'selected' : '',
                children: build.longVersion
              }, i, false, {
                fileName: _jsxFileName,
                lineNumber: 764,
                columnNumber: 21
              }, void 0) : null;
            })]
          }, void 0, true, {
            fileName: _jsxFileName,
            lineNumber: 758,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 738,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "mb-2 flex-row-reverse remixui_nightlyBuilds custom-control custom-checkbox",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
            className: "mr-2 custom-control-input",
            id: "nightlies",
            type: "checkbox",
            onChange: handleNightliesChange,
            checked: state.includeNightlies
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 771,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            htmlFor: "nightlies",
            "data-id": "compilerNightliesBuild",
            className: "form-check-label custom-control-label",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.includeNightlyBuilds",
              defaultMessage: "Include nightly builds"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 773,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 772,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 770,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "mt-2 remixui_compilerConfig custom-control custom-checkbox",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
            className: "remixui_autocompile custom-control-input",
            type: "checkbox",
            onChange: handleAutoCompile,
            "data-id": "compilerContainerAutoCompile",
            id: "autoCompile",
            title: "Auto compile",
            checked: state.autoCompile
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 777,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "form-check-label custom-control-label",
            htmlFor: "autoCompile",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.autoCompile",
              defaultMessage: "Auto compile"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 779,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 778,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 776,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "mt-1 mb-2 remixui_compilerConfig custom-control custom-checkbox",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
            className: "remixui_autocompile custom-control-input",
            onChange: handleHideWarningsChange,
            id: "hideWarningsBox",
            type: "checkbox",
            title: "Hide warnings",
            checked: state.hideWarnings
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 783,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "form-check-label custom-control-label",
            htmlFor: "hideWarningsBox",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.hideWarnings",
              defaultMessage: "Hide warnings"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 785,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 784,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 782,
          columnNumber: 11
        }, void 0), isHardhatProject && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "mt-3 remixui_compilerConfig custom-control custom-checkbox",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
            className: "remixui_autocompile custom-control-input",
            onChange: updatehhCompilation,
            id: "enableHardhat",
            type: "checkbox",
            title: "Enable Hardhat Compilation",
            checked: hhCompilation
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 791,
            columnNumber: 15
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "form-check-label custom-control-label",
            htmlFor: "enableHardhat",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.enableHardhat",
              defaultMessage: "Enable Hardhat Compilation"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 793,
              columnNumber: 17
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 792,
            columnNumber: 15
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("a", {
            className: "mt-1 text-nowrap",
            href: "https://remix-ide.readthedocs.io/en/latest/hardhat.html#enable-hardhat-compilation",
            target: '_blank',
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
              placement: 'right',
              tooltipClasses: "text-nowrap",
              tooltipId: "overlay-tooltip-hardhat",
              tooltipText: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                className: "border bg-light text-dark p-1 pr-3",
                style: {
                  minWidth: '230px'
                },
                children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                  id: "solidity.learnHardhat",
                  defaultMessage: "Learn how to use Hardhat Compilation"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 801,
                  columnNumber: 23
                }, void 0)
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 800,
                columnNumber: 32
              }, void 0),
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
                style: {
                  fontSize: 'medium'
                },
                className: 'ml-2 fal fa-info-circle',
                "aria-hidden": "true"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 804,
                columnNumber: 19
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 796,
              columnNumber: 17
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 795,
            columnNumber: 15
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 790,
          columnNumber: 13
        }, void 0), isTruffleProject && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "mt-3 remixui_compilerConfig custom-control custom-checkbox",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
            className: "remixui_autocompile custom-control-input",
            onChange: updateTruffleCompilation,
            id: "enableTruffle",
            type: "checkbox",
            title: "Enable Truffle Compilation",
            checked: truffleCompilation
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 812,
            columnNumber: 15
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "form-check-label custom-control-label",
            htmlFor: "enableTruffle",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.enableTruffle",
              defaultMessage: "Enable Truffle Compilation"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 814,
              columnNumber: 17
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 813,
            columnNumber: 15
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("a", {
            className: "mt-1 text-nowrap",
            href: "https://remix-ide.readthedocs.io/en/latest/truffle.html#enable-truffle-compilation",
            target: '_blank',
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
              placement: 'right',
              tooltipClasses: "text-nowrap",
              tooltipId: "overlay-tooltip-truffle",
              tooltipText: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                className: "border bg-light text-dark p-1 pr-3",
                style: {
                  minWidth: '230px'
                },
                children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                  id: "solidity.learnTruffle",
                  defaultMessage: "Learn how to use Truffle Compilation"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 822,
                  columnNumber: 23
                }, void 0)
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 821,
                columnNumber: 32
              }, void 0),
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
                style: {
                  fontSize: 'medium'
                },
                className: 'ml-2 fal fa-info-circle',
                "aria-hidden": "true"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 825,
                columnNumber: 19
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 817,
              columnNumber: 17
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 816,
            columnNumber: 15
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 811,
          columnNumber: 13
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 737,
        columnNumber: 9
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: "d-flex px-4 remixui_compilerConfigSection justify-content-between",
        onClick: toggleConfigurations,
        children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "d-flex",
          children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "mt-1 remixui_compilerConfigSection",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.advancedConfigurations",
              defaultMessage: "Advanced Configurations"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 834,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 833,
            columnNumber: 13
          }, void 0)
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 832,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
            "data-id": "scConfigExpander",
            onClick: toggleConfigurations,
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
              className: !toggleExpander ? 'fas fa-angle-right' : 'fas fa-angle-down',
              "aria-hidden": "true"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 839,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 838,
            columnNumber: 13
          }, void 0)
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 837,
          columnNumber: 11
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 831,
        columnNumber: 9
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: `px-4 pb-4 border-bottom flex-column ${toggleExpander ? "d-flex" : "d-none"}`,
        children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "d-flex pb-1 remixui_compilerConfig custom-control custom-radio",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
            className: "custom-control-input",
            type: "radio",
            name: "configradio",
            value: "manual",
            onChange: toggleConfigType,
            checked: !state.useFileConfiguration,
            id: "scManualConfig"
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 845,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "form-check-label custom-control-label",
            htmlFor: "scManualConfig",
            "data-id": "scManualConfiguration",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.compilerConfiguration",
              defaultMessage: "Compiler configuration"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 847,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 846,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 844,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: `flex-column 'd-flex'}`,
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
            className: "mb-2 ml-4",
            children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
              className: "remixui_compilerLabel form-check-label",
              htmlFor: "compilierLanguageSelector",
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                id: "solidity.language",
                defaultMessage: "Language"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 853,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 852,
              columnNumber: 15
            }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
              placement: "right-start",
              tooltipId: "compilerLabelTooltip",
              tooltipClasses: "text-nowrap",
              tooltipText: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                children: 'Language specification available from   Compiler >= v0.5.7'
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 859,
                columnNumber: 30
              }, void 0),
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("select", {
                onChange: e => handleLanguageChange(e.target.value),
                disabled: state.useFileConfiguration,
                value: state.language,
                className: "custom-select",
                id: "compilierLanguageSelector",
                children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("option", {
                  "data-id": state.language === 'Solidity' ? 'selected' : '',
                  value: "Solidity",
                  children: "Solidity"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 862,
                  columnNumber: 19
                }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("option", {
                  "data-id": state.language === 'Yul' ? 'selected' : '',
                  value: "Yul",
                  children: "Yul"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 863,
                  columnNumber: 19
                }, void 0)]
              }, void 0, true, {
                fileName: _jsxFileName,
                lineNumber: 861,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 855,
              columnNumber: 15
            }, void 0)]
          }, void 0, true, {
            fileName: _jsxFileName,
            lineNumber: 851,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
            className: "mb-2 ml-4",
            children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
              className: "remixui_compilerLabel form-check-label",
              htmlFor: "evmVersionSelector",
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                id: "solidity.evmVersion",
                defaultMessage: "EVM Version"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 869,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 868,
              columnNumber: 15
            }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("select", {
              value: state.evmVersion,
              onChange: e => handleEvmVersionChange(e.target.value),
              disabled: state.useFileConfiguration,
              className: "custom-select",
              id: "evmVersionSelector",
              children: compileTabLogic.evmVersions.map((version, index) => /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("option", {
                "data-id": state.evmVersion === version ? 'selected' : '',
                value: version,
                children: version
              }, index, false, {
                fileName: _jsxFileName,
                lineNumber: 872,
                columnNumber: 71
              }, void 0))
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 871,
              columnNumber: 15
            }, void 0)]
          }, void 0, true, {
            fileName: _jsxFileName,
            lineNumber: 867,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
            className: "mt-1 mt-3 border-dark pb-3 ml-4 remixui_compilerConfig custom-control custom-checkbox",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
              className: "justify-content-between align-items-center d-flex",
              children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
                onChange: e => {
                  handleOptimizeChange(e.target.checked);
                },
                disabled: state.useFileConfiguration,
                className: "custom-control-input",
                id: "optimize",
                type: "checkbox",
                checked: state.optimize
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 877,
                columnNumber: 17
              }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
                className: "form-check-label custom-control-label",
                htmlFor: "optimize",
                children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                  id: "solidity.enableOptimization",
                  defaultMessage: "Enable optimization"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 879,
                  columnNumber: 19
                }, void 0)
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 878,
                columnNumber: 17
              }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
                min: "1",
                className: "custom-select ml-2 remixui_runs",
                id: "runs",
                placeholder: "200",
                value: state.runs,
                type: "number",
                title: "Estimated number of times each opcode of the deployed code will be executed across the life-time of the contract.",
                onChange: e => onChangeRuns(e.target.value),
                disabled: !state.optimize || state.useFileConfiguration
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 881,
                columnNumber: 17
              }, void 0)]
            }, void 0, true, {
              fileName: _jsxFileName,
              lineNumber: 876,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 875,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 850,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "d-flex pb-1 remixui_compilerConfig custom-control custom-radio",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
            className: "custom-control-input",
            type: "radio",
            name: "configradio",
            value: "file",
            onChange: toggleConfigType,
            checked: state.useFileConfiguration,
            id: "scFileConfig"
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 896,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "form-check-label custom-control-label",
            htmlFor: "scFileConfig",
            "data-id": "scFileConfiguration",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.useConfigurationFile",
              defaultMessage: "Use configuration file"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 898,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 897,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 895,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: `pt-2 ml-4 ml-2 align-items-start justify-content-between d-flex`,
          children: [!showFilePathInput && state.useFileConfiguration && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
            placement: "bottom",
            tooltipId: "configfileTooltip",
            tooltipClasses: "text-nowrap",
            tooltipText: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
              children: "Click to open the config file"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 906,
              columnNumber: 30
            }, void 0),
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
              onClick: configFilePath === '' ? () => {} : async () => {
                await openFile();
              },
              className: "py-2 remixui_compilerConfigPath",
              children: configFilePath === '' ? 'No file selected.' : configFilePath
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 910,
              columnNumber: 17
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 902,
            columnNumber: 68
          }, void 0), !showFilePathInput && !state.useFileConfiguration && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
            className: "py-2 text-secondary",
            children: configFilePath
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 915,
            columnNumber: 69
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("input", {
            ref: configFilePathInput,
            className: `py-0 my-0 form-control ${showFilePathInput ? "d-flex" : "d-none"}`,
            placeholder: "/folder_path/file_name.json",
            title: "If the file you entered does not exist you will be able to create one in the next step.",
            disabled: !state.useFileConfiguration,
            "data-id": "scConfigFilePathInput",
            onKeyPress: event => {
              if (event.key === 'Enter') {
                handleConfigPathChange();
              }
            }
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 916,
            columnNumber: 13
          }, void 0), !showFilePathInput && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            disabled: !state.useFileConfiguration,
            "data-id": "scConfigChangeFilePath",
            className: "btn btn-sm btn-secondary",
            onClick: () => {
              setShowFilePathInput(true);
            },
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
              id: "solidity.change",
              defaultMessage: "Change"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 930,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 929,
            columnNumber: 36
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 901,
          columnNumber: 11
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 843,
        columnNumber: 9
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: "px-4",
        children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
          id: "compileBtn",
          "data-id": "compilerContainerCompileBtn",
          className: "btn btn-primary btn-block d-block w-100 text-break remixui_disabled mb-1 mt-3",
          onClick: compile,
          disabled: configFilePath === '' && state.useFileConfiguration || disableCompileButton,
          children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
            placement: "auto",
            tooltipId: "overlay-tooltip-compile",
            tooltipText: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
              className: "text-left",
              children: [!(configFilePath === '' && state.useFileConfiguration) && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
                children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("b", {
                  children: "Ctrl+S"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 940,
                  columnNumber: 83
                }, void 0), " for compiling"]
              }, void 0, true, {
                fileName: _jsxFileName,
                lineNumber: 940,
                columnNumber: 78
              }, void 0), configFilePath === '' && state.useFileConfiguration && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
                children: " No config file selected"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 941,
                columnNumber: 77
              }, void 0)]
            }, void 0, true, {
              fileName: _jsxFileName,
              lineNumber: 939,
              columnNumber: 28
            }, void 0),
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
              children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
                ref: compileIcon,
                className: "fas fa-sync remixui_iconbtn",
                "aria-hidden": "true"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 945,
                columnNumber: 19
              }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                id: "solidity.compile",
                defaultMessage: "Compile"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 946,
                columnNumber: 17
              }, void 0), typeof state.compiledFileName === 'string' ? (0, _helper.extractNameFromKey)(state.compiledFileName) || `<${intl.formatMessage({
                id: 'solidity.noFileSelected',
                defaultMessage: 'no file selected'
              })}>` : `<${intl.formatMessage({
                id: 'solidity.noFileSelected',
                defaultMessage: 'no file selected'
              })}>`]
            }, void 0, true, {
              fileName: _jsxFileName,
              lineNumber: 944,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 936,
            columnNumber: 13
          }, void 0)
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 935,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "d-flex align-items-center",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            id: "compileAndRunBtn",
            "data-id": "compilerContainerCompileAndRunBtn",
            className: "btn btn-secondary btn-block d-block w-100 text-break remixui_solidityCompileAndRunButton d-inline-block remixui_disabled mb-1 mt-3",
            onClick: compileAndRun,
            disabled: configFilePath === '' && state.useFileConfiguration || disableCompileButton,
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
              placement: "auto",
              tooltipId: "overlay-tooltip-compile-run",
              tooltipText: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
                className: "text-left",
                children: [!(configFilePath === '' && state.useFileConfiguration) && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
                  children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("b", {
                    children: "Ctrl+Shift+S"
                  }, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 972,
                    columnNumber: 85
                  }, void 0), " for compiling and script execution"]
                }, void 0, true, {
                  fileName: _jsxFileName,
                  lineNumber: 972,
                  columnNumber: 80
                }, void 0), configFilePath === '' && state.useFileConfiguration && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
                  children: " No config file selected"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 973,
                  columnNumber: 79
                }, void 0)]
              }, void 0, true, {
                fileName: _jsxFileName,
                lineNumber: 971,
                columnNumber: 30
              }, void 0),
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                  id: "solidity.compileAndRunScript",
                  defaultMessage: "Compile and Run script"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 977,
                  columnNumber: 19
                }, void 0)
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 976,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 968,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 961,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
            placement: "auto",
            tooltipId: "overlay-tooltip-compile-run-doc",
            tooltipText: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
              className: "text-left p-2",
              children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
                children: "Choose the script to execute right after compilation by adding the `dev-run-script` natspec tag, as in:"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 985,
                columnNumber: 19
              }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("pre", {
                children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("code", {
                  children: ["/**", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 988,
                    columnNumber: 24
                  }, void 0), "* @title ContractName", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 989,
                    columnNumber: 44
                  }, void 0), "* @dev ContractDescription", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 990,
                    columnNumber: 49
                  }, void 0), "* @custom:dev-run-script file_path", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 991,
                    columnNumber: 57
                  }, void 0), "*/", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 992,
                    columnNumber: 25
                  }, void 0), "contract ContractName ", '{}', /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 993,
                    columnNumber: 51
                  }, void 0)]
                }, void 0, true, {
                  fileName: _jsxFileName,
                  lineNumber: 987,
                  columnNumber: 21
                }, void 0)
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 986,
                columnNumber: 19
              }, void 0), "Click to know more"]
            }, void 0, true, {
              fileName: _jsxFileName,
              lineNumber: 984,
              columnNumber: 28
            }, void 0),
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("a", {
              href: "https://remix-ide.readthedocs.io/en/latest/running_js_scripts.html#compile-a-contract-and-run-a-script-on-the-fly",
              target: "_blank",
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
                className: "pl-2 ml-2 mt-3 mb-1 fas fa-info text-dark"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 999,
                columnNumber: 156
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 999,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 981,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_clipboard.CopyToClipboard, {
            tip: "Click to copy the custom NatSpec tag",
            getContent: () => '@custom:dev-run-script file_path',
            direction: "top",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
              className: "btn remixui_copyButton  ml-2 mt-3 mb-1 text-dark",
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
                className: "remixui_copyIcon far fa-copy",
                "aria-hidden": "true"
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 1003,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 1002,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 1001,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 960,
          columnNumber: 11
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 934,
        columnNumber: 9
      }, void 0)]
    }, void 0, true, {
      fileName: _jsxFileName,
      lineNumber: 736,
      columnNumber: 7
    }, void 0)
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 735,
    columnNumber: 5
  }, void 0);
};
exports.CompilerContainer = CompilerContainer;
var _default = CompilerContainer;
exports.default = _default;
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../../../../node_modules/process/browser.js */ "../../../node_modules/process/browser.js")))

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/compilerConfiguration.tsx":
/*!*****************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/compilerConfiguration.tsx ***!
  \*****************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.configFileContent = void 0;
const configFileContent = `
{
	"language": "Solidity",
	"settings": {
		"optimizer": {
			"enabled": true,
			"runs": 200
		},
		"outputSelection": {
			"*": {
			"": ["ast"],
			"*": ["abi", "metadata", "devdoc", "userdoc", "storageLayout", "evm.legacyAssembly", "evm.bytecode", "evm.deployedBytecode", "evm.methodIdentifiers", "evm.gasEstimates", "evm.assembly"]
			}
		},
		"evmVersion": "byzantium"
	}
}
`;
exports.configFileContent = configFileContent;

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/contract-selection.tsx":
/*!**************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/contract-selection.tsx ***!
  \**************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ContractSelection = void 0;
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _reactIntl = __webpack_require__(/*! react-intl */ "../../../node_modules/react-intl/lib/index.js");
var _publishToStorage = __webpack_require__(/*! @remix-ui/publish-to-storage */ "../../../libs/remix-ui/publish-to-storage/src/index.ts");
var _treeView = __webpack_require__(/*! @remix-ui/tree-view */ "../../../libs/remix-ui/tree-view/src/index.ts");
var _clipboard = __webpack_require__(/*! @remix-ui/clipboard */ "../../../libs/remix-ui/clipboard/src/index.ts");
__webpack_require__(/*! ./css/style.css */ "../../../libs/remix-ui/solidity-compiler/src/lib/css/style.css");
var _helper = __webpack_require__(/*! @remix-ui/helper */ "../../../libs/remix-ui/helper/src/index.ts");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/contract-selection.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const ContractSelection = props => {
  const {
    api,
    compiledFileName,
    contractsDetails,
    contractList,
    modal
  } = props;
  const [selectedContract, setSelectedContract] = (0, _react.useState)('');
  const [storage, setStorage] = (0, _react.useState)(null);
  const intl = (0, _reactIntl.useIntl)();
  (0, _react.useEffect)(() => {
    if (contractList.length) {
      const compiledPathArr = compiledFileName.split('/');
      const compiledFile = compiledPathArr[compiledPathArr.length - 1];
      const contractsInCompiledFile = contractList.filter(obj => obj.file === compiledFile);
      if (contractsInCompiledFile.length) setSelectedContract(contractsInCompiledFile[0].name);else setSelectedContract(contractList[0].name);
    }
  }, [contractList]);
  const resetStorage = () => {
    setStorage('');
  };
  const handleContractChange = contractName => {
    setSelectedContract(contractName);
  };
  const handlePublishToStorage = type => {
    setStorage(type);
  };
  const copyABI = () => {
    return copyContractProperty('abi');
  };
  const copyContractProperty = property => {
    let content = getContractProperty(property);
    if (!content) {
      return;
    }
    try {
      if (typeof content !== 'string') {
        content = JSON.stringify(content, null, '\t');
      }
    } catch (e) {}
    return content;
  };
  const getContractProperty = property => {
    if (!selectedContract) throw new Error('No contract compiled yet');
    const contractProperties = contractsDetails[selectedContract];
    if (contractProperties && contractProperties[property]) return contractProperties[property];
    return null;
  };
  const renderData = (item, key, keyPath) => {
    const data = extractData(item);
    const children = (data.children || []).map(child => renderData(child.value, child.key, keyPath + '/' + child.key));
    if (children && children.length > 0) {
      return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_treeView.TreeViewItem, {
        id: `treeViewItem${key}`,
        label: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "d-flex mt-2 flex-row remixui_label_item",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "small font-weight-bold pr-1 remixui_label_key",
            children: [key, ":"]
          }, void 0, true, {
            fileName: _jsxFileName,
            lineNumber: 75,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "m-0 remixui_label_value",
            children: typeof data.self === 'boolean' ? `${data.self}` : data.self
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 76,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 74,
          columnNumber: 11
        }, void 0),
        children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_treeView.TreeView, {
          id: `treeView${key}`,
          children: children
        }, keyPath, false, {
          fileName: _jsxFileName,
          lineNumber: 79,
          columnNumber: 11
        }, void 0)
      }, keyPath, false, {
        fileName: _jsxFileName,
        lineNumber: 73,
        columnNumber: 9
      }, void 0);
    } else {
      return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_treeView.TreeViewItem, {
        id: key.toString(),
        label: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "d-flex mt-2 flex-row remixui_label_item",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "small font-weight-bold pr-1 remixui_label_key",
            children: [key, ":"]
          }, void 0, true, {
            fileName: _jsxFileName,
            lineNumber: 87,
            columnNumber: 11
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "m-0 remixui_label_value",
            children: typeof data.self === 'boolean' ? `${data.self}` : data.self
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 88,
            columnNumber: 11
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 86,
          columnNumber: 9
        }, void 0)
      }, keyPath, false, {
        fileName: _jsxFileName,
        lineNumber: 85,
        columnNumber: 14
      }, void 0);
    }
  };
  const extractData = item => {
    const ret = {
      children: null,
      self: null
    };
    if (item instanceof Array) {
      ret.children = item.map((item, index) => ({
        key: index,
        value: item
      }));
      ret.self = '';
    } else if (item instanceof Object) {
      ret.children = Object.keys(item).map(key => ({
        key: key,
        value: item[key]
      }));
      ret.self = '';
    } else {
      ret.self = item;
      ret.children = [];
    }
    return ret;
  };
  const insertValue = (details, propertyName) => {
    let node;
    if (propertyName === 'web3Deploy' || propertyName === 'name' || propertyName === 'Assembly') {
      node = /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("pre", {
        children: details[propertyName]
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 113,
        columnNumber: 14
      }, void 0);
    } else if (details[propertyName] && (propertyName === 'abi' || propertyName === 'metadata')) {
      if (details[propertyName] !== '') {
        try {
          node = /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
            children: typeof details[propertyName] === 'object' ? /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_treeView.TreeView, {
              id: "treeView",
              children: Object.keys(details[propertyName]).map(innerkey => renderData(details[propertyName][innerkey], innerkey, innerkey))
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 119,
              columnNumber: 17
            }, void 0) : /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_treeView.TreeView, {
              id: "treeView",
              children: Object.keys(JSON.parse(details[propertyName])).map(innerkey => renderData(JSON.parse(details[propertyName])[innerkey], innerkey, innerkey))
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 123,
              columnNumber: 29
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 117,
            columnNumber: 18
          }, void 0); // catch in case the parsing fails.
        } catch (e) {
          node = /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
            children: ["Unable to display \"$", propertyName, "\": $", e.message]
          }, void 0, true, {
            fileName: _jsxFileName,
            lineNumber: 131,
            columnNumber: 18
          }, void 0);
        }
      } else {
        node = /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          children: " - "
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 134,
          columnNumber: 16
        }, void 0);
      }
    } else {
      node = /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        children: JSON.stringify(details[propertyName], null, 4)
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 137,
        columnNumber: 14
      }, void 0);
    }
    return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("pre", {
      className: "remixui_value",
      children: node || ''
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 139,
      columnNumber: 12
    }, void 0);
  };
  const details = () => {
    if (!selectedContract) throw new Error('No contract compiled yet');
    const help = {
      Assembly: 'Assembly opcodes describing the contract including corresponding solidity source code',
      Opcodes: 'Assembly opcodes describing the contract',
      'Runtime Bytecode': 'Bytecode storing the state and being executed during normal contract call',
      bytecode: 'Bytecode being executed during contract creation',
      functionHashes: 'List of declared function and their corresponding hash',
      gasEstimates: 'Gas estimation for each function call',
      metadata: 'Contains all informations related to the compilation',
      metadataHash: 'Hash representing all metadata information',
      abi: 'ABI: describing all the functions (input/output params, scope, ...)',
      name: 'Name of the compiled contract',
      swarmLocation: 'Swarm url where all metadata information can be found (contract needs to be published first)',
      web3Deploy: 'Copy/paste this code to any JavaScript/Web3 console to deploy this contract'
    };
    const contractProperties = contractsDetails[selectedContract] || {};
    const log = /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      className: "remixui_detailsJSON",
      children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_treeView.TreeView, {
        children: Object.keys(contractProperties).map((propertyName, index) => {
          const copyDetails = /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
            className: "remixui_copyDetails",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_clipboard.CopyToClipboard, {
              content: contractProperties[propertyName],
              direction: "top"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 164,
              columnNumber: 71
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 164,
            columnNumber: 33
          }, void 0);
          const questionMark = /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
            className: "remixui_questionMark",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
              title: intl.formatMessage({
                id: `solidity.${propertyName}`,
                defaultMessage: help[propertyName]
              }),
              className: "fas fa-question-circle",
              "aria-hidden": "true"
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 165,
              columnNumber: 73
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 165,
            columnNumber: 34
          }, void 0);
          return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
            className: "remixui_log",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_treeView.TreeViewItem, {
              label: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
                "data-id": `remixui_treeviewitem_${propertyName}`,
                className: "remixui_key",
                children: [propertyName, " ", copyDetails, " ", questionMark]
              }, void 0, true, {
                fileName: _jsxFileName,
                lineNumber: 171,
                columnNumber: 21
              }, void 0),
              children: insertValue(contractProperties, propertyName)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 169,
              columnNumber: 17
            }, void 0)
          }, index, false, {
            fileName: _jsxFileName,
            lineNumber: 168,
            columnNumber: 15
          }, void 0);
        })
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 161,
        columnNumber: 7
      }, void 0)
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 160,
      columnNumber: 17
    }, void 0);
    modal(selectedContract, log, 'Close', null);
  };
  const copyBytecode = () => {
    return copyContractProperty('bytecode');
  };
  return (
    /*#__PURE__*/
    // define swarm logo
    (0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
      children: [contractList.length ? /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("section", {
        className: "remixui_compilerSection pt-3",
        children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
          className: "mb-3",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("label", {
            className: "remixui_compilerLabel form-check-label",
            htmlFor: "compiledContracts",
            children: "Contract"
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 196,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("select", {
            onChange: e => handleContractChange(e.target.value),
            value: selectedContract,
            "data-id": "compiledContracts",
            id: "compiledContracts",
            className: "custom-select",
            children: contractList.map(({
              name,
              file
            }, index) => /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("option", {
              value: name,
              children: [name, " (", file, ")"]
            }, index, true, {
              fileName: _jsxFileName,
              lineNumber: 198,
              columnNumber: 61
            }, void 0))
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 197,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 195,
          columnNumber: 11
        }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("article", {
          className: "mt-2 pb-0",
          children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            id: "publishOnIpfs",
            className: "btn btn-secondary btn-block",
            onClick: () => {
              handlePublishToStorage('ipfs');
            },
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
              placement: "right-start",
              tooltipId: "publishOnIpfsTooltip",
              tooltipClasses: "text-nowrap",
              tooltipText: `${intl.formatMessage({
                id: 'solidity.publishOn',
                defaultMessage: 'Publish on'
              })} Ipfs`,
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                  children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                    id: "solidity.publishOn",
                    defaultMessage: "Publish on"
                  }, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 210,
                    columnNumber: 25
                  }, void 0), " Ipfs"]
                }, void 0, true, {
                  fileName: _jsxFileName,
                  lineNumber: 210,
                  columnNumber: 19
                }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("img", {
                  id: "ipfsLogo",
                  className: "remixui_storageLogo ml-2",
                  src: "assets/img/ipfs.webp"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 211,
                  columnNumber: 19
                }, void 0)]
              }, void 0, true, {
                fileName: _jsxFileName,
                lineNumber: 209,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 203,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 202,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            id: "publishOnSwarm",
            className: "btn btn-secondary btn-block",
            onClick: () => {
              handlePublishToStorage('swarm');
            },
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
              placement: "right-start",
              tooltipId: "publishOnSwarmTooltip",
              tooltipClasses: "text-nowrap",
              tooltipText: `${intl.formatMessage({
                id: 'solidity.publishOn',
                defaultMessage: 'Publish on'
              })} Swarm`,
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                  children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                    id: "solidity.publishOn",
                    defaultMessage: "Publish on"
                  }, void 0, false, {
                    fileName: _jsxFileName,
                    lineNumber: 223,
                    columnNumber: 25
                  }, void 0), " Swarm"]
                }, void 0, true, {
                  fileName: _jsxFileName,
                  lineNumber: 223,
                  columnNumber: 19
                }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("img", {
                  id: "swarmLogo",
                  className: "remixui_storageLogo ml-2",
                  src: "assets/img/swarm.webp"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 224,
                  columnNumber: 19
                }, void 0)]
              }, void 0, true, {
                fileName: _jsxFileName,
                lineNumber: 222,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 216,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 215,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
            "data-id": "compilation-details",
            className: "btn btn-secondary btn-block",
            onClick: () => {
              details();
            },
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_helper.CustomTooltip, {
              placement: "right-start",
              tooltipId: "CompilationDetailsTooltip",
              tooltipClasses: "text-nowrap",
              tooltipText: "Display Contract Details",
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_reactIntl.FormattedMessage, {
                  id: "solidity.compilationDetails",
                  defaultMessage: "Compilation Details"
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 235,
                  columnNumber: 23
                }, void 0)
              }, void 0, false, {
                fileName: _jsxFileName,
                lineNumber: 235,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 229,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 228,
            columnNumber: 13
          }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
            className: "remixui_contractHelperButtons",
            children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
              className: "input-group",
              children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
                className: "btn-group",
                role: "group",
                "aria-label": "Copy to Clipboard",
                children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_clipboard.CopyToClipboard, {
                  title: "Copy ABI to clipboard",
                  getContent: copyABI,
                  direction: "top",
                  children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
                    className: "btn remixui_copyButton",
                    title: "Copy ABI to clipboard",
                    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
                      className: "remixui_copyIcon far fa-copy",
                      "aria-hidden": "true"
                    }, void 0, false, {
                      fileName: _jsxFileName,
                      lineNumber: 244,
                      columnNumber: 23
                    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                      children: "ABI"
                    }, void 0, false, {
                      fileName: _jsxFileName,
                      lineNumber: 245,
                      columnNumber: 23
                    }, void 0)]
                  }, void 0, true, {
                    fileName: _jsxFileName,
                    lineNumber: 243,
                    columnNumber: 21
                  }, void 0)
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 242,
                  columnNumber: 19
                }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_clipboard.CopyToClipboard, {
                  title: "Copy ABI to clipboard",
                  getContent: copyBytecode,
                  direction: "top",
                  children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
                    className: "btn remixui_copyButton",
                    title: "Copy Bytecode to clipboard",
                    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
                      className: "remixui_copyIcon far fa-copy",
                      "aria-hidden": "true"
                    }, void 0, false, {
                      fileName: _jsxFileName,
                      lineNumber: 250,
                      columnNumber: 23
                    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
                      children: "Bytecode"
                    }, void 0, false, {
                      fileName: _jsxFileName,
                      lineNumber: 251,
                      columnNumber: 23
                    }, void 0)]
                  }, void 0, true, {
                    fileName: _jsxFileName,
                    lineNumber: 249,
                    columnNumber: 21
                  }, void 0)
                }, void 0, false, {
                  fileName: _jsxFileName,
                  lineNumber: 248,
                  columnNumber: 19
                }, void 0)]
              }, void 0, true, {
                fileName: _jsxFileName,
                lineNumber: 241,
                columnNumber: 17
              }, void 0)
            }, void 0, false, {
              fileName: _jsxFileName,
              lineNumber: 240,
              columnNumber: 15
            }, void 0)
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 239,
            columnNumber: 13
          }, void 0)]
        }, void 0, true, {
          fileName: _jsxFileName,
          lineNumber: 201,
          columnNumber: 11
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 193,
        columnNumber: 11
      }, void 0) : /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("section", {
        className: "remixui_container clearfix",
        children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("article", {
          className: "px-2 mt-2 pb-0 d-flex w-100",
          children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
            className: "mt-2 mx-3 w-100 alert alert-warning",
            role: "alert",
            children: "No Contract Compiled Yet"
          }, void 0, false, {
            fileName: _jsxFileName,
            lineNumber: 259,
            columnNumber: 11
          }, void 0)
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 258,
          columnNumber: 70
        }, void 0)
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 258,
        columnNumber: 22
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_publishToStorage.PublishToStorage, {
        api: api,
        storage: storage,
        contract: contractsDetails[selectedContract],
        resetStorage: resetStorage
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 262,
        columnNumber: 7
      }, void 0)]
    }, void 0, true)
  );
};
exports.ContractSelection = ContractSelection;
var _default = ContractSelection;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/css/style.css":
/*!*****************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/css/style.css ***!
  \*****************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./style.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/solidity-compiler/src/lib/css/style.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/logic/compileTabLogic.ts":
/*!****************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/logic/compileTabLogic.ts ***!
  \****************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CompileTabLogic = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _remixSolidity = __webpack_require__(/*! @remix-project/remix-solidity */ "../../../dist/libs/remix-solidity/src/index.js");
var _events = __webpack_require__(/*! events */ "../../../node_modules/events/events.js");
const _paq = window._paq = window._paq || []; //eslint-disable-line

class CompileTabLogic {
  constructor(api, contentImport) {
    this.api = api;
    this.contentImport = contentImport;
    (0, _defineProperty2.default)(this, "compiler", void 0);
    (0, _defineProperty2.default)(this, "optimize", void 0);
    (0, _defineProperty2.default)(this, "runs", void 0);
    (0, _defineProperty2.default)(this, "evmVersion", void 0);
    (0, _defineProperty2.default)(this, "language", void 0);
    (0, _defineProperty2.default)(this, "compilerImport", void 0);
    (0, _defineProperty2.default)(this, "event", void 0);
    (0, _defineProperty2.default)(this, "evmVersions", void 0);
    (0, _defineProperty2.default)(this, "useFileConfiguration", void 0);
    (0, _defineProperty2.default)(this, "configFilePath", void 0);
    this.event = new _events.EventEmitter();
    this.compiler = new _remixSolidity.Compiler((url, cb) => api.resolveContentAndSave(url).then(result => cb(null, result)).catch(error => cb(error.message)));
    this.evmVersions = ['default', 'berlin', 'london', 'istanbul', 'petersburg', 'constantinople', 'byzantium', 'spuriousDragon', 'tangerineWhistle', 'homestead'];
  }
  init() {
    this.optimize = this.api.getCompilerParameters().optimize;
    this.api.setCompilerParameters({
      optimize: this.optimize
    });
    this.compiler.set('optimize', this.optimize);
    this.runs = this.api.getCompilerParameters().runs;
    this.runs = this.runs && this.runs !== 'undefined' ? this.runs : 200;
    this.api.setCompilerParameters({
      runs: this.runs
    });
    this.compiler.set('runs', this.runs);
    this.evmVersion = this.api.getCompilerParameters().evmVersion;
    if (this.evmVersion === 'undefined' || this.evmVersion === 'null' || !this.evmVersion || !this.evmVersions.includes(this.evmVersion)) {
      this.evmVersion = null;
    }
    this.api.setCompilerParameters({
      evmVersion: this.evmVersion
    });
    this.compiler.set('evmVersion', this.evmVersion);
    this.language = (0, _remixSolidity.getValidLanguage)(this.api.getCompilerParameters().language);
    if (this.language != null) {
      this.compiler.set('language', this.language);
    }
  }
  setOptimize(newOptimizeValue) {
    this.optimize = newOptimizeValue;
    this.api.setCompilerParameters({
      optimize: this.optimize
    });
    this.compiler.set('optimize', this.optimize);
  }
  setUseFileConfiguration(useFileConfiguration) {
    this.useFileConfiguration = useFileConfiguration;
    this.compiler.set('useFileConfiguration', useFileConfiguration);
  }
  setConfigFilePath(path) {
    this.configFilePath = path;
  }
  setRuns(runs) {
    this.runs = runs;
    this.api.setCompilerParameters({
      runs: this.runs
    });
    this.compiler.set('runs', this.runs);
  }
  setEvmVersion(newEvmVersion) {
    this.evmVersion = newEvmVersion;
    this.api.setCompilerParameters({
      evmVersion: this.evmVersion
    });
    this.compiler.set('evmVersion', this.evmVersion);
  }
  getCompilerState() {
    return this.compiler.state;
  }

  /**
   * Set the compiler to using Solidity or Yul (default to Solidity)
   * @params lang {'Solidity' | 'Yul'} ...
   */
  setLanguage(lang) {
    this.language = lang;
    this.api.setCompilerParameters({
      language: lang
    });
    this.compiler.set('language', lang);
  }

  /**
   * Compile a specific file of the file manager
   * @param {string} target the path to the file to compile
   */
  compileFile(target) {
    if (!target) throw new Error('No target provided for compiliation');
    return new Promise((resolve, reject) => {
      this.api.readFile(target).then(content => {
        const sources = {
          [target]: {
            content
          }
        };
        this.event.emit('removeAnnotations');
        this.event.emit('startingCompilation');
        if (this.configFilePath) {
          this.api.readFile(this.configFilePath).then(contentConfig => {
            this.compiler.set('configFileContent', contentConfig);
          });
        }
        // setTimeout fix the animation on chrome... (animation triggered by 'staringCompilation')
        setTimeout(() => {
          this.compiler.compile(sources, target);
          resolve(true);
        }, 100);
      }).catch(error => {
        reject(error);
      });
    });
  }
  async isHardhatProject() {
    if (this.api.getFileManagerMode() === 'localhost') {
      return (await this.api.fileExists('hardhat.config.js')) || (await this.api.fileExists('hardhat.config.ts'));
    } else return false;
  }
  async isTruffleProject() {
    if (this.api.getFileManagerMode() === 'localhost') {
      return await this.api.fileExists('truffle-config.js');
    } else return false;
  }
  async isFoundryProject() {
    if (this.api.getFileManagerMode() === 'localhost') {
      return await this.api.fileExists('foundry.toml');
    } else return false;
  }
  runCompiler(externalCompType) {
    try {
      if (this.api.getFileManagerMode() === 'localhost') {
        if (externalCompType === 'hardhat') {
          const {
            currentVersion,
            optimize,
            runs
          } = this.compiler.state;
          if (currentVersion) {
            const fileContent = `module.exports = {
              solidity: '${currentVersion.substring(0, currentVersion.indexOf('+commit'))}',
              settings: {
                optimizer: {
                  enabled: ${optimize},
                  runs: ${runs}
                }
              }
            }
            `;
            const configFilePath = 'remix-compiler.config.js';
            this.api.writeFile(configFilePath, fileContent);
            _paq.push(['trackEvent', 'compiler', 'runCompile', 'compileWithHardhat']);
            this.api.compileWithHardhat(configFilePath).then(result => {
              this.api.logToTerminal({
                type: 'log',
                value: result
              });
            }).catch(error => {
              this.api.logToTerminal({
                type: 'error',
                value: error
              });
            });
          }
        } else if (externalCompType === 'truffle') {
          const {
            currentVersion,
            optimize,
            runs,
            evmVersion
          } = this.compiler.state;
          if (currentVersion) {
            const fileContent = `module.exports = {
              compilers: {
                solc: {
                  version: '${currentVersion.substring(0, currentVersion.indexOf('+commit'))}',
                  settings: {
                    optimizer: {
                      enabled: ${optimize},
                      runs: ${runs},
                    },
                    evmVersion: ${evmVersion}
                  }
                }
              }
            }`;
            const configFilePath = 'remix-compiler.config.js';
            this.api.writeFile(configFilePath, fileContent);
            _paq.push(['trackEvent', 'compiler', 'runCompile', 'compileWithTruffle']);
            this.api.compileWithTruffle(configFilePath).then(result => {
              this.api.logToTerminal({
                type: 'log',
                value: result
              });
            }).catch(error => {
              this.api.logToTerminal({
                type: 'error',
                value: error
              });
            });
          }
        }
      }
      // TODO readd saving current file
      this.api.saveCurrentFile();
      const currentFile = this.api.currentFile;
      return this.compileFile(currentFile);
    } catch (err) {
      console.error(err);
    }
  }
}
exports.CompileTabLogic = CompileTabLogic;

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/logic/contract-parser.ts":
/*!****************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/logic/contract-parser.ts ***!
  \****************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseContracts = parseContracts;
var solcTranslate = _interopRequireWildcard(__webpack_require__(/*! solc/translate */ "../../../node_modules/solc/translate.js"));
var _remixLib = __webpack_require__(/*! @remix-project/remix-lib */ "../../../dist/libs/remix-lib/src/index.js");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
const txHelper = _remixLib.execution.txHelper;
function parseContracts(contractName, contract, source) {
  const detail = {};
  detail.name = contractName;
  detail.metadata = contract.metadata;
  if (contract.evm.bytecode.object) {
    detail.bytecode = contract.evm.bytecode.object;
  }
  detail.abi = contract.abi;
  detail.storageLayout = contract.storageLayout;
  if (contract.evm.bytecode.object) {
    detail.bytecode = contract.evm.bytecode;
    detail.web3Deploy = gethDeploy(contractName.toLowerCase(), contract.abi, contract.evm.bytecode.object);
    detail.metadataHash = retrieveMetadataHash(contract.evm.bytecode.object);
    if (detail.metadataHash) {
      detail.swarmLocation = 'bzzr://' + detail.metadataHash;
    }
  }
  detail.functionHashes = {};
  for (const fun in contract.evm.methodIdentifiers) {
    detail.functionHashes[contract.evm.methodIdentifiers[fun]] = fun;
  }
  detail.gasEstimates = formatGasEstimates(contract.evm.gasEstimates);
  detail.devdoc = contract.devdoc;
  detail.userdoc = contract.userdoc;
  if (contract.evm.deployedBytecode && contract.evm.deployedBytecode.object.length > 0) {
    detail['Runtime Bytecode'] = contract.evm.deployedBytecode;
  }
  if (source && contract.assembly !== null) {
    detail.Assembly = solcTranslate.prettyPrintLegacyAssemblyJSON(contract.evm.legacyAssembly, source.content);
  }
  return detail;
}
const retrieveMetadataHash = function retrieveMetadataHash(bytecode) {
  let match = /a165627a7a72305820([0-9a-f]{64})0029$/.exec(bytecode);
  if (!match) {
    match = /a265627a7a72305820([0-9a-f]{64})6c6578706572696d656e74616cf50037$/.exec(bytecode);
  }
  if (match) {
    return match[1];
  }
};
const gethDeploy = function gethDeploy(contractName, jsonInterface, bytecode) {
  let code = '';
  const funABI = txHelper.getConstructorInterface(jsonInterface);
  funABI.inputs.forEach(function (inp) {
    code += 'var ' + inp.name + ' = /* var of type ' + inp.type + ' here */ ;\n';
  });
  contractName = contractName.replace(/[:./]/g, '_');
  code += 'var ' + contractName + 'Contract = new web3.eth.Contract(' + JSON.stringify(jsonInterface).replace('\n', '') + ');' + '\nvar ' + contractName + ' = ' + contractName + 'Contract.deploy({' + "\n     data: '0x" + bytecode + "', " + '\n     arguments: [';
  funABI.inputs.forEach(function (inp) {
    code += '\n          ' + inp.name + ',';
  });
  code += '\n     ]' + '\n}).send({' + '\n     from: web3.eth.accounts[0], ' + "\n     gas: '4700000'" + '\n   }, function (e, contract){' + '\n    console.log(e, contract);' + "\n    if (typeof contract.address !== 'undefined') {" + "\n         console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);" + '\n    }' + '\n })';
  return code;
};
const formatGasEstimates = function formatGasEstimates(data) {
  if (!data) return {};
  if (data.creation === undefined && data.external === undefined && data.internal === undefined) return {};
  const gasToText = function gasToText(g) {
    return g === null ? 'unknown' : g;
  };
  const ret = {};
  let fun;
  if ('creation' in data) {
    ret.Creation = data.creation;
  }
  if ('external' in data) {
    ret.External = {};
    for (fun in data.external) {
      ret.External[fun] = gasToText(data.external[fun]);
    }
  }
  if ('internal' in data) {
    ret.Internal = {};
    for (fun in data.internal) {
      ret.Internal[fun] = gasToText(data.internal[fun]);
    }
  }
  return ret;
};

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/logic/index.ts":
/*!******************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/logic/index.ts ***!
  \******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _compileTabLogic = __webpack_require__(/*! ./compileTabLogic */ "../../../libs/remix-ui/solidity-compiler/src/lib/logic/compileTabLogic.ts");
Object.keys(_compileTabLogic).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _compileTabLogic[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _compileTabLogic[key];
    }
  });
});
var _contractParser = __webpack_require__(/*! ./contract-parser */ "../../../libs/remix-ui/solidity-compiler/src/lib/logic/contract-parser.ts");
Object.keys(_contractParser).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _contractParser[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _contractParser[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/reducers/compiler.ts":
/*!************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/reducers/compiler.ts ***!
  \************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compilerReducer = exports.compilerInitialState = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const compilerInitialState = {
  compiler: {
    mode: '',
    args: null
  },
  editor: {
    mode: ''
  }
};
exports.compilerInitialState = compilerInitialState;
const compilerReducer = (state = compilerInitialState, action) => {
  switch (action.type) {
    case 'SET_COMPILER_MODE':
      {
        return _objectSpread(_objectSpread({}, state), {}, {
          compiler: _objectSpread(_objectSpread({}, state.compiler), {}, {
            mode: action.payload.mode,
            args: action.payload.args || null
          })
        });
      }
    case 'RESET_COMPILER_MODE':
      {
        return _objectSpread(_objectSpread({}, state), {}, {
          compiler: _objectSpread(_objectSpread({}, state.compiler), {}, {
            mode: '',
            args: null
          })
        });
      }
    case 'SET_EDITOR_MODE':
      {
        return _objectSpread(_objectSpread({}, state), {}, {
          editor: _objectSpread(_objectSpread({}, state.editor), {}, {
            mode: action.payload
          })
        });
      }
    case 'RESET_EDITOR_MODE':
      {
        return _objectSpread(_objectSpread({}, state), {}, {
          editor: _objectSpread(_objectSpread({}, state.editor), {}, {
            mode: ''
          })
        });
      }
    default:
      throw new Error();
  }
};
exports.compilerReducer = compilerReducer;

/***/ }),

/***/ "../../../libs/remix-ui/solidity-compiler/src/lib/solidity-compiler.tsx":
/*!*************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/solidity-compiler.tsx ***!
  \*************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.SolidityCompiler = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _compilerContainer = __webpack_require__(/*! ./compiler-container */ "../../../libs/remix-ui/solidity-compiler/src/lib/compiler-container.tsx");
var _contractSelection = __webpack_require__(/*! ./contract-selection */ "../../../libs/remix-ui/solidity-compiler/src/lib/contract-selection.tsx");
var _toaster = __webpack_require__(/*! @remix-ui/toaster */ "../../../libs/remix-ui/toaster/src/index.ts");
var _modalDialog = __webpack_require__(/*! @remix-ui/modal-dialog */ "../../../libs/remix-ui/modal-dialog/src/index.ts");
var _renderer = __webpack_require__(/*! @remix-ui/renderer */ "../../../libs/remix-ui/renderer/src/index.ts");
__webpack_require__(/*! ./css/style.css */ "../../../libs/remix-ui/solidity-compiler/src/lib/css/style.css");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/solidity-compiler.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const SolidityCompiler = props => {
  const {
    api,
    api: {
      currentFile,
      compileTabLogic,
      configurationSettings
    }
  } = props;
  const [state, setState] = (0, _react.useState)({
    isHardhatProject: false,
    isTruffleProject: false,
    isFoundryProject: false,
    workspaceName: '',
    currentFile,
    configFilePath: 'compiler_config.json',
    loading: false,
    compileTabLogic: null,
    compiler: null,
    toasterMsg: '',
    modal: {
      hide: true,
      title: '',
      message: null,
      okLabel: '',
      okFn: () => {},
      cancelLabel: '',
      cancelFn: () => {},
      handleHide: null
    }
  });
  const [currentVersion, setCurrentVersion] = (0, _react.useState)('');
  const [hideWarnings, setHideWarnings] = (0, _react.useState)(false);
  const [compileErrors, setCompileErrors] = (0, _react.useState)({
    [currentFile]: api.compileErrors
  });
  const [badgeStatus, setBadgeStatus] = (0, _react.useState)({});
  const [contractsFile, setContractsFile] = (0, _react.useState)({});
  (0, _react.useEffect)(() => {
    (async () => {
      const hide = (await api.getAppParameter('hideWarnings')) || false;
      setHideWarnings(hide);
    })();
  }, []);
  (0, _react.useEffect)(() => {
    if (badgeStatus[currentFile]) {
      api.emit('statusChanged', badgeStatus[currentFile]);
    } else {
      api.emit('statusChanged', {
        key: 'none'
      });
    }
  }, [badgeStatus[currentFile], currentFile]);

  // Return the file name of a path: ex "browser/ballot.sol" -> "ballot.sol"
  const getFileName = path => {
    const part = path.split('/');
    return part[part.length - 1];
  };
  api.onCurrentFileChanged = currentFile => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        currentFile
      });
    });
  };
  api.onSetWorkspace = async (isLocalhost, workspaceName) => {
    const isHardhat = isLocalhost && (await compileTabLogic.isHardhatProject());
    const isTruffle = isLocalhost && (await compileTabLogic.isTruffleProject());
    const isFoundry = isLocalhost && (await compileTabLogic.isFoundryProject());
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        currentFile,
        isHardhatProject: isHardhat,
        workspaceName: workspaceName,
        isTruffleProject: isTruffle,
        isFoundryProject: isFoundry
      });
    });
  };
  api.onFileRemoved = path => {
    if (path === state.configFilePath) setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        configFilePath: ''
      });
    });
  };
  api.onNoFileSelected = () => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        currentFile: ''
      });
    });
    setCompileErrors({});
  };
  api.onCompilationFinished = compilationDetails => {
    const {
      contractMap,
      contractsDetails,
      target
    } = compilationDetails;
    const contractList = contractMap ? Object.keys(contractMap).map(key => {
      return {
        name: key,
        file: getFileName(contractMap[key].file)
      };
    }) : [];
    setContractsFile(_objectSpread(_objectSpread({}, contractsFile), {}, {
      [target]: {
        contractList,
        contractsDetails
      }
    }));
    setCompileErrors(_objectSpread(_objectSpread({}, compileErrors), {}, {
      [currentFile]: api.compileErrors
    }));
  };
  api.onFileClosed = name => {
    if (name === currentFile) {
      setCompileErrors(_objectSpread(_objectSpread({}, compileErrors), {}, {
        [currentFile]: {}
      }));
      setBadgeStatus(_objectSpread(_objectSpread({}, badgeStatus), {}, {
        [currentFile]: {
          key: 'none'
        }
      }));
    }
  };
  api.statusChanged = data => {
    setBadgeStatus(_objectSpread(_objectSpread({}, badgeStatus), {}, {
      [currentFile]: data
    }));
  };
  const setConfigFilePath = path => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        configFilePath: path
      });
    });
  };
  const toast = message => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        toasterMsg: message
      });
    });
  };
  const updateCurrentVersion = value => {
    setCurrentVersion(value);
    api.setCompilerParameters({
      version: value
    });
  };
  const modal = async (title, message, okLabel, okFn, cancelLabel, cancelFn) => {
    await setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        modal: _objectSpread(_objectSpread({}, prevState.modal), {}, {
          hide: false,
          message,
          title,
          okLabel,
          okFn,
          cancelLabel,
          cancelFn
        })
      });
    });
  };
  const handleHideModal = () => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        modal: _objectSpread(_objectSpread({}, state.modal), {}, {
          hide: true,
          message: null
        })
      });
    });
  };
  const panicMessage = message => /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("i", {
      className: "fas fa-exclamation-circle remixui_panicError",
      "aria-hidden": "true"
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 160,
      columnNumber: 7
    }, void 0), "The compiler returned with the following internal error: ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 161,
      columnNumber: 64
    }, void 0), " ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("b", {
      children: [message, ".", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 161,
        columnNumber: 84
      }, void 0), "The compiler might be in a non-sane state, please be careful and do not use further compilation data to deploy to mainnet. It is heavily recommended to use another browser not affected by this issue (Firefox is known to not be affected)."]
    }, void 0, true, {
      fileName: _jsxFileName,
      lineNumber: 161,
      columnNumber: 71
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("br", {}, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 163,
      columnNumber: 125
    }, void 0), "Please join ", /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("a", {
      href: "https://gitter.im/ethereum/remix",
      target: "blank",
      children: "remix gitter channel"
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 164,
      columnNumber: 19
    }, void 0), " for more information."]
  }, void 0, true, {
    fileName: _jsxFileName,
    lineNumber: 159,
    columnNumber: 5
  }, void 0);
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      id: "compileTabView",
      children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_compilerContainer.CompilerContainer, {
        api: api,
        isHardhatProject: state.isHardhatProject,
        workspaceName: state.workspaceName,
        isTruffleProject: state.isTruffleProject,
        isFoundryProject: state.isFoundryProject,
        compileTabLogic: compileTabLogic,
        tooltip: toast,
        modal: modal,
        compiledFileName: currentFile,
        updateCurrentVersion: updateCurrentVersion,
        configurationSettings: configurationSettings,
        configFilePath: state.configFilePath,
        setConfigFilePath: setConfigFilePath
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 171,
        columnNumber: 9
      }, void 0), contractsFile[currentFile] && contractsFile[currentFile].contractsDetails && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_contractSelection.ContractSelection, {
        api: api,
        compiledFileName: currentFile,
        contractsDetails: contractsFile[currentFile].contractsDetails,
        contractList: contractsFile[currentFile].contractList,
        modal: modal
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 186,
        columnNumber: 88
      }, void 0), compileErrors[currentFile] && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: "remixui_errorBlobs p-4",
        "data-id": "compiledErrors",
        children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
          "data-id": `compilationFinishedWith_${currentVersion}`
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 189,
          columnNumber: 13
        }, void 0), compileErrors[currentFile].error && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_renderer.Renderer, {
          message: compileErrors[currentFile].error.formattedMessage || compileErrors[currentFile].error,
          plugin: api,
          opt: {
            type: compileErrors[currentFile].error.severity || 'error',
            errorType: compileErrors[currentFile].error.type
          }
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 190,
          columnNumber: 51
        }, void 0), compileErrors[currentFile].error && compileErrors[currentFile].error.mode === 'panic' && modal('Error', panicMessage(compileErrors[currentFile].error.formattedMessage), 'Close', null), compileErrors[currentFile].errors && compileErrors[currentFile].errors.length && compileErrors[currentFile].errors.map((err, index) => {
          if (hideWarnings) {
            if (err.severity !== 'warning') {
              return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_renderer.Renderer, {
                message: err.formattedMessage,
                plugin: api,
                opt: {
                  type: err.severity,
                  errorType: err.type
                }
              }, index, false, {
                fileName: _jsxFileName,
                lineNumber: 195,
                columnNumber: 26
              }, void 0);
            }
          } else {
            return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_renderer.Renderer, {
              message: err.formattedMessage,
              plugin: api,
              opt: {
                type: err.severity,
                errorType: err.type
              }
            }, index, false, {
              fileName: _jsxFileName,
              lineNumber: 198,
              columnNumber: 24
            }, void 0);
          }
        })]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 188,
        columnNumber: 11
      }, void 0)]
    }, void 0, true, {
      fileName: _jsxFileName,
      lineNumber: 170,
      columnNumber: 7
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_toaster.Toaster, {
      message: state.toasterMsg
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 204,
      columnNumber: 7
    }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_modalDialog.ModalDialog, {
      id: "workspacesModalDialog",
      title: state.modal.title,
      message: state.modal.message,
      hide: state.modal.hide,
      okLabel: state.modal.okLabel,
      okFn: state.modal.okFn,
      cancelLabel: state.modal.cancelLabel,
      cancelFn: state.modal.cancelFn,
      handleHide: handleHideModal,
      children: typeof state.modal.message !== 'string' && state.modal.message
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 205,
      columnNumber: 7
    }, void 0)]
  }, void 0, true);
};
exports.SolidityCompiler = SolidityCompiler;
var _default = SolidityCompiler;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/toaster/src/index.ts":
/*!**********************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/toaster/src/index.ts ***!
  \**********************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _toaster = __webpack_require__(/*! ./lib/toaster */ "../../../libs/remix-ui/toaster/src/lib/toaster.tsx");
Object.keys(_toaster).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _toaster[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _toaster[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/toaster/src/lib/toaster.css":
/*!*****************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/toaster/src/lib/toaster.css ***!
  \*****************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./toaster.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/toaster/src/lib/toaster.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/toaster/src/lib/toaster.tsx":
/*!*****************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/toaster/src/lib/toaster.tsx ***!
  \*****************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.Toaster = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _modalDialog = __webpack_require__(/*! @remix-ui/modal-dialog */ "../../../libs/remix-ui/modal-dialog/src/index.ts");
__webpack_require__(/*! ./toaster.css */ "../../../libs/remix-ui/toaster/src/lib/toaster.css");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/toaster/src/lib/toaster.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const Toaster = props => {
  const [state, setState] = (0, _react.useState)({
    message: '',
    hide: true,
    hiding: false,
    timeOutId: null,
    timeOut: props.timeOut || 7000,
    showModal: false,
    showFullBtn: false
  });
  (0, _react.useEffect)(() => {
    if (props.message) {
      const timeOutId = setTimeout(() => {
        setState(prevState => {
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hiding: true
          });
        });
      }, state.timeOut);
      setState(prevState => {
        if (typeof props.message === 'string' && props.message.length > 201) {
          const shortTooltipText = props.message.substring(0, 200) + '...';
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hide: false,
            hiding: false,
            timeOutId,
            message: shortTooltipText
          });
        } else {
          const shortTooltipText = props.message;
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hide: false,
            hiding: false,
            timeOutId,
            message: shortTooltipText
          });
        }
      });
    }
  }, [props.message, props.timestamp]);
  (0, _react.useEffect)(() => {
    if (state.hiding) {
      setTimeout(() => {
        closeTheToaster();
      }, 1800);
    }
  }, [state.hiding]);
  const showFullMessage = () => {
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        showModal: true
      });
    });
  };
  const hideFullMessage = () => {
    //eslint-disable-line
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        showModal: false
      });
    });
  };
  const closeTheToaster = () => {
    if (state.timeOutId) {
      clearTimeout(state.timeOutId);
    }
    props.handleHide && props.handleHide();
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        message: '',
        hide: true,
        hiding: false,
        timeOutId: null,
        showModal: false
      });
    });
  };
  const handleMouseEnter = () => {
    if (state.timeOutId) {
      clearTimeout(state.timeOutId);
    }
    setState(prevState => {
      return _objectSpread(_objectSpread({}, prevState), {}, {
        timeOutId: null
      });
    });
  };
  const handleMouseLeave = () => {
    if (!state.timeOutId) {
      const timeOutId = setTimeout(() => {
        setState(prevState => {
          return _objectSpread(_objectSpread({}, prevState), {}, {
            hiding: true
          });
        });
      }, state.timeOut);
      setState(prevState => {
        return _objectSpread(_objectSpread({}, prevState), {}, {
          timeOutId
        });
      });
    }
  };
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_jsxDevRuntime.Fragment, {
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_modalDialog.ModalDialog, {
      id: "toaster",
      message: props.message,
      cancelLabel: "Close",
      cancelFn: () => {},
      hide: !state.showModal,
      handleHide: hideFullMessage
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 110,
      columnNumber: 7
    }, void 0), !state.hide && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      "data-shared": "tooltipPopup",
      className: `remixui_tooltip alert alert-info p-2 ${state.hiding ? 'remixui_animateTop' : 'remixui_animateBottom'}`,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
        className: "px-2",
        children: [state.message, state.showFullBtn && /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
          className: "btn btn-secondary btn-sm mx-3",
          style: {
            whiteSpace: 'nowrap'
          },
          onClick: showFullMessage,
          children: "Show full message"
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 122,
          columnNumber: 36
        }, void 0)]
      }, void 0, true, {
        fileName: _jsxFileName,
        lineNumber: 120,
        columnNumber: 11
      }, void 0), /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
        style: {
          alignSelf: 'baseline'
        },
        children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("button", {
          "data-id": "tooltipCloseButton",
          className: "fas fa-times btn-info mx-1 p-0",
          onClick: closeTheToaster
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 125,
          columnNumber: 13
        }, void 0)
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 124,
        columnNumber: 11
      }, void 0)]
    }, void 0, true, {
      fileName: _jsxFileName,
      lineNumber: 119,
      columnNumber: 9
    }, void 0)]
  }, void 0, true);
};
exports.Toaster = Toaster;
var _default = Toaster;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/tree-view/src/index.ts":
/*!************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/index.ts ***!
  \************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var _treeViewItem = __webpack_require__(/*! ./lib/tree-view-item/tree-view-item */ "../../../libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.tsx");
Object.keys(_treeViewItem).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _treeViewItem[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _treeViewItem[key];
    }
  });
});
var _remixUiTreeView = __webpack_require__(/*! ./lib/remix-ui-tree-view */ "../../../libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.tsx");
Object.keys(_remixUiTreeView).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _remixUiTreeView[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _remixUiTreeView[key];
    }
  });
});

/***/ }),

/***/ "../../../libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.css":
/*!******************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.css ***!
  \******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./remix-ui-tree-view.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.tsx":
/*!******************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.tsx ***!
  \******************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.TreeView = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _objectWithoutProperties2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/objectWithoutProperties */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/objectWithoutProperties.js"));
var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
__webpack_require__(/*! ./remix-ui-tree-view.css */ "../../../libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.css");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
const _excluded = ["children", "id"];
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.tsx";
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const TreeView = props => {
  const {
      children,
      id
    } = props,
    otherProps = (0, _objectWithoutProperties2.default)(props, _excluded);
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("ul", _objectSpread(_objectSpread({
    "data-id": `treeViewUl${id}`,
    className: "ul_tv ml-0 pl-2"
  }, otherProps), {}, {
    children: children
  }), void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 10,
    columnNumber: 5
  }, void 0);
};
exports.TreeView = TreeView;
var _default = TreeView;
exports.default = _default;

/***/ }),

/***/ "../../../libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.css":
/*!*****************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.css ***!
  \*****************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var content = __webpack_require__(/*! !../../../../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../../../../node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!./tree-view-item.css */ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.css");

if (typeof content === 'string') {
  content = [[module.i, content, '']];
}

var options = {}

options.insert = "head";
options.singleton = false;

var update = __webpack_require__(/*! ../../../../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js")(content, options);

if (content.locals) {
  module.exports = content.locals;
}


/***/ }),

/***/ "../../../libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.tsx":
/*!*****************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.tsx ***!
  \*****************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.TreeViewItem = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _objectWithoutProperties2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/objectWithoutProperties */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/objectWithoutProperties.js"));
var _react = _interopRequireWildcard(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
__webpack_require__(/*! ./tree-view-item.css */ "../../../libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.css");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
const _excluded = ["id", "children", "label", "labelClass", "expand", "iconX", "iconY", "icon", "controlBehaviour", "innerRef", "showIcon"];
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.tsx";
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }
const TreeViewItem = props => {
  const {
      id,
      children,
      label,
      labelClass,
      expand,
      iconX = 'fas fa-caret-right',
      iconY = 'fas fa-caret-down',
      icon,
      controlBehaviour = false,
      innerRef,
      showIcon = true
    } = props,
    otherProps = (0, _objectWithoutProperties2.default)(props, _excluded);
  const [isExpanded, setIsExpanded] = (0, _react.useState)(false);
  (0, _react.useEffect)(() => {
    setIsExpanded(expand);
  }, [expand]);
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("li", _objectSpread(_objectSpread({
    ref: innerRef,
    "data-id": `treeViewLi${id}`,
    className: "li_tv"
  }, otherProps), {}, {
    children: [/*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
      "data-id": `treeViewDiv${id}`,
      className: `d-flex flex-row align-items-center ${labelClass}`,
      onClick: () => !controlBehaviour && setIsExpanded(!isExpanded),
      children: [children && showIcon ? /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: isExpanded ? `px-1 ${iconY} caret caret_tv` : `px-1 ${iconX} caret caret_tv`,
        style: {
          visibility: children ? 'visible' : 'hidden'
        }
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 17,
        columnNumber: 34
      }, void 0) : icon ? /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
        className: `pr-3 pl-1 ${icon} caret caret_tv`
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 17,
        columnNumber: 200
      }, void 0) : null, /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("span", {
        className: "w-100 pl-1",
        children: label
      }, void 0, false, {
        fileName: _jsxFileName,
        lineNumber: 18,
        columnNumber: 9
      }, void 0)]
    }, `treeViewDiv${id}`, true, {
      fileName: _jsxFileName,
      lineNumber: 16,
      columnNumber: 7
    }, void 0), isExpanded ? children : null]
  }), `treeViewLi${id}`, true, {
    fileName: _jsxFileName,
    lineNumber: 15,
    columnNumber: 5
  }, void 0);
};
exports.TreeViewItem = TreeViewItem;
var _default = TreeViewItem;
exports.default = _default;

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.css":
/*!**************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/clipboard/src/lib/copy-to-clipboard/copy-to-clipboard.css ***!
  \**************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".copyIcon {\n    margin-left: 5px;\n    cursor: pointer;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcHktdG8tY2xpcGJvYXJkLmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtJQUNJLGdCQUFnQjtJQUNoQixlQUFlO0FBQ25CIiwiZmlsZSI6ImNvcHktdG8tY2xpcGJvYXJkLmNzcyIsInNvdXJjZXNDb250ZW50IjpbIi5jb3B5SWNvbiB7XG4gICAgbWFyZ2luLWxlZnQ6IDVweDtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG59Il19 */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/modal-dialog-custom.css ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, "\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJtb2RhbC1kaWFsb2ctY3VzdG9tLmNzcyJ9 */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/modal-dialog/src/lib/remix-ui-modal-dialog.css ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".remixModalContent {\n  box-shadow: 0 0 8px 10000px rgba(0,0,0,0.6),0 6px 20px 0 rgba(0,0,0,0.19);\n  -webkit-animation-name: animatetop;\n  -webkit-animation-duration: 0.4s;\n  animation-name: animatetop;\n  animation-duration: 0.4s\n}\n.remixModalBody {\n  overflow-y: auto;\n  max-height: 600px;\n  white-space: pre-line;\n}\n@keyframes animatetop {\n  from {top: -300px; opacity: 0}\n  to {top: 0; opacity: 1}\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlbWl4LXVpLW1vZGFsLWRpYWxvZy5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFDRSx5RUFBeUU7RUFDekUsa0NBQWtDO0VBQ2xDLGdDQUFnQztFQUNoQywwQkFBMEI7RUFDMUI7QUFDRjtBQUNBO0VBQ0UsZ0JBQWdCO0VBQ2hCLGlCQUFpQjtFQUNqQixxQkFBcUI7QUFDdkI7QUFLQTtFQUNFLE1BQU0sV0FBVyxFQUFFLFVBQVU7RUFDN0IsSUFBSSxNQUFNLEVBQUUsVUFBVTtBQUN4QiIsImZpbGUiOiJyZW1peC11aS1tb2RhbC1kaWFsb2cuY3NzIiwic291cmNlc0NvbnRlbnQiOlsiLnJlbWl4TW9kYWxDb250ZW50IHtcbiAgYm94LXNoYWRvdzogMCAwIDhweCAxMDAwMHB4IHJnYmEoMCwwLDAsMC42KSwwIDZweCAyMHB4IDAgcmdiYSgwLDAsMCwwLjE5KTtcbiAgLXdlYmtpdC1hbmltYXRpb24tbmFtZTogYW5pbWF0ZXRvcDtcbiAgLXdlYmtpdC1hbmltYXRpb24tZHVyYXRpb246IDAuNHM7XG4gIGFuaW1hdGlvbi1uYW1lOiBhbmltYXRldG9wO1xuICBhbmltYXRpb24tZHVyYXRpb246IDAuNHNcbn1cbi5yZW1peE1vZGFsQm9keSB7XG4gIG92ZXJmbG93LXk6IGF1dG87XG4gIG1heC1oZWlnaHQ6IDYwMHB4O1xuICB3aGl0ZS1zcGFjZTogcHJlLWxpbmU7XG59XG5ALXdlYmtpdC1rZXlmcmFtZXMgYW5pbWF0ZXRvcCB7XG4gIGZyb20ge3RvcDogLTMwMHB4OyBvcGFjaXR5OiAwfVxuICB0byB7dG9wOiAwOyBvcGFjaXR5OiAxfVxufVxuQGtleWZyYW1lcyBhbmltYXRldG9wIHtcbiAgZnJvbSB7dG9wOiAtMzAwcHg7IG9wYWNpdHk6IDB9XG4gIHRvIHt0b3A6IDA7IG9wYWNpdHk6IDF9XG59Il19 */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/renderer/src/lib/renderer.css":
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/renderer/src/lib/renderer.css ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".remixui_sol.success,\n.remixui_sol.error,\n.remixui_sol.warning {\n    white-space: pre-line;\n    word-wrap: break-word;\n    cursor: pointer;\n    position: relative;\n    margin: 0.5em 0 1em 0;\n    border-radius: 5px;\n    line-height: 20px;\n    padding: 8px 15px;\n}\n\n.remixui_sol.success pre,\n.remixui_sol.error pre,\n.remixui_sol.warning pre {\n    white-space: pre-line;\n    overflow-y: hidden;\n    background-color: transparent;\n    margin: 0;\n    font-size: 12px;\n    border: 0 none;\n    padding: 0;\n    border-radius: 0;\n}\n\n.remixui_sol.success .close,\n.remixui_sol.error .close,\n.remixui_sol.warning .close {\n    visibility: hidden;\n    white-space: pre-line;\n    font-weight: bold;\n    position: absolute;\n    color: hsl(0, 0%, 0%); /* black in style-guide.js */\n    top: 0;\n    right: 0;\n    padding: 0.5em;\n}\n\n.remixui_sol.error {\n}\n\n.remixui_sol.warning {\n}\n\n.remixui_sol.success {\n  /* background-color:  // styles.rightPanel.message_Success_BackgroundColor; */\n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlbmRlcmVyLmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0lBR0kscUJBQXFCO0lBQ3JCLHFCQUFxQjtJQUNyQixlQUFlO0lBQ2Ysa0JBQWtCO0lBQ2xCLHFCQUFxQjtJQUNyQixrQkFBa0I7SUFDbEIsaUJBQWlCO0lBQ2pCLGlCQUFpQjtBQUNyQjs7QUFFQTs7O0lBR0kscUJBQXFCO0lBQ3JCLGtCQUFrQjtJQUNsQiw2QkFBNkI7SUFDN0IsU0FBUztJQUNULGVBQWU7SUFDZixjQUFjO0lBQ2QsVUFBVTtJQUNWLGdCQUFnQjtBQUNwQjs7QUFFQTs7O0lBR0ksa0JBQWtCO0lBQ2xCLHFCQUFxQjtJQUNyQixpQkFBaUI7SUFDakIsa0JBQWtCO0lBQ2xCLHFCQUFxQixFQUFFLDRCQUE0QjtJQUNuRCxNQUFNO0lBQ04sUUFBUTtJQUNSLGNBQWM7QUFDbEI7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0VBQ0UsNkVBQTZFO0FBQy9FIiwiZmlsZSI6InJlbmRlcmVyLmNzcyIsInNvdXJjZXNDb250ZW50IjpbIi5yZW1peHVpX3NvbC5zdWNjZXNzLFxuLnJlbWl4dWlfc29sLmVycm9yLFxuLnJlbWl4dWlfc29sLndhcm5pbmcge1xuICAgIHdoaXRlLXNwYWNlOiBwcmUtbGluZTtcbiAgICB3b3JkLXdyYXA6IGJyZWFrLXdvcmQ7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcbiAgICBtYXJnaW46IDAuNWVtIDAgMWVtIDA7XG4gICAgYm9yZGVyLXJhZGl1czogNXB4O1xuICAgIGxpbmUtaGVpZ2h0OiAyMHB4O1xuICAgIHBhZGRpbmc6IDhweCAxNXB4O1xufVxuXG4ucmVtaXh1aV9zb2wuc3VjY2VzcyBwcmUsXG4ucmVtaXh1aV9zb2wuZXJyb3IgcHJlLFxuLnJlbWl4dWlfc29sLndhcm5pbmcgcHJlIHtcbiAgICB3aGl0ZS1zcGFjZTogcHJlLWxpbmU7XG4gICAgb3ZlcmZsb3cteTogaGlkZGVuO1xuICAgIGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50O1xuICAgIG1hcmdpbjogMDtcbiAgICBmb250LXNpemU6IDEycHg7XG4gICAgYm9yZGVyOiAwIG5vbmU7XG4gICAgcGFkZGluZzogMDtcbiAgICBib3JkZXItcmFkaXVzOiAwO1xufVxuXG4ucmVtaXh1aV9zb2wuc3VjY2VzcyAuY2xvc2UsXG4ucmVtaXh1aV9zb2wuZXJyb3IgLmNsb3NlLFxuLnJlbWl4dWlfc29sLndhcm5pbmcgLmNsb3NlIHtcbiAgICB2aXNpYmlsaXR5OiBoaWRkZW47XG4gICAgd2hpdGUtc3BhY2U6IHByZS1saW5lO1xuICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICBjb2xvcjogaHNsKDAsIDAlLCAwJSk7IC8qIGJsYWNrIGluIHN0eWxlLWd1aWRlLmpzICovXG4gICAgdG9wOiAwO1xuICAgIHJpZ2h0OiAwO1xuICAgIHBhZGRpbmc6IDAuNWVtO1xufVxuXG4ucmVtaXh1aV9zb2wuZXJyb3Ige1xufVxuXG4ucmVtaXh1aV9zb2wud2FybmluZyB7XG59XG5cbi5yZW1peHVpX3NvbC5zdWNjZXNzIHtcbiAgLyogYmFja2dyb3VuZC1jb2xvcjogIC8vIHN0eWxlcy5yaWdodFBhbmVsLm1lc3NhZ2VfU3VjY2Vzc19CYWNrZ3JvdW5kQ29sb3I7ICovXG59XG4iXX0= */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/solidity-compiler/src/lib/css/style.css":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/solidity-compiler/src/lib/css/style.css ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".remixui_title {\n  font-size: 1.1em;\n  font-weight: bold;\n  margin-bottom: 1em;\n}\n.remixui_panicError {\n  color: red;\n  font-size: 20px;\n}\n.remixui_crow {\n  display: flex;\n  overflow: auto;\n  clear: both;\n  padding: .2em;\n}\n.remixui_checkboxText {\n  font-weight: normal;\n}\n.remixui_crow label {\n  cursor:pointer;\n}\n.remixui_crowNoFlex {\n  overflow: auto;\n  clear: both;\n}\n.remixui_info {\n  padding: 10px;\n  word-break: break-word;\n}\n.remixui_contract {\n  display: block;\n  margin: 3% 0;\n}\n.remixui_nightlyBuilds {\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n}\n.remixui_autocompileContainer {\n  display: flex;\n  align-items: center;\n}\n.remixui_runs {\n  width: 40%;\n}\n.remixui_hideWarningsContainer {\n  display: flex;\n  align-items: center;\n}\n.remixui_autocompile {}\n.remixui_autocompileTitle {\n  font-weight: bold;\n  margin: 1% 0;\n}\n.remixui_autocompileText {\n  margin: 1% 0;\n  font-size: 12px;\n  overflow: hidden;\n  word-break: normal;\n  line-height: initial;\n}\n.remixui_warnCompilationSlow {\n  margin-left: 1%;\n}\n.remixui_compilerConfig {\n  display: flex;\n  align-items: center;\n}\n.remixui_compilerConfig label {\n  margin: 0;\n}\n.remixui_compilerSection {\n  padding: 12px 24px 16px;\n}\n.remixui_compilerConfigSection:hover {\n  cursor: pointer;\n}\n.remixui_compilerConfigSection {\n  font-size: 1rem;\n}\n.remixui_compilerConfigPath {\n  cursor: pointer;\n}\n.remixui_compilerLabel {\n  margin-bottom: 2px;\n  font-size: 11px;\n  line-height: 12px;\n  text-transform: uppercase;\n}\n.remixui_copyButton {\n  padding: 6px;\n  font-weight: bold;\n  font-size: 11px;\n  line-height: 15px;\n}\n.remixui_name {\n  display: flex;\n}\n.remixui_size {\n  display: flex;\n}\n.remixui_checkboxes {\n  display: flex;\n  width: 100%;\n  justify-content: space-between;\n  flex-wrap: wrap;\n}\n.remixui_compileButton {\n  width: 100%;\n  margin: 15px 0 10px 0;\n  font-size: 12px;\n}\n.remixui_container {\n  margin: 0;\n}\n.remixui_optimizeContainer {\n  display: flex;\n}\n.remixui_noContractAlert {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n.remixui_contractHelperButtons {\n  margin-top: 6px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  float: right;\n}\n.remixui_copyToClipboard {\n  font-size: 1rem;\n}\n.remixui_copyIcon {\n  margin-right: 5px;\n}\n.remixui_log {\n  display: flex;\n  flex-direction: column;\n  margin-bottom: 5%;\n  overflow: visible;\n}\n.remixui_key {\n  margin-right: 5px;\n  text-transform: uppercase;\n  width: 100%;\n}\n.remixui_value {\n  display: flex;\n  width: 100%;\n  margin-top: 1.5%;\n}\n.remixui_questionMark {\n  margin-left: 2%;\n  cursor: pointer;\n}\n.remixui_questionMark:hover {\n}\n.remixui_detailsJSON {\n  padding: 8px 0;\n  border: none;\n}\n.remixui_iconbtn {\n  margin-right: 0.3em;\n}\n.remixui_errorBlobs {\n  padding-left: 5px;\n  padding-right: 5px;\n  word-break: break-word;\n}\n.remixui_storageLogo {\n  width: 20px;\n  height: 20px;\n}\n.remixui_spinningIcon {\n  display: inline-block;\n  position: relative;\n  animation: spin 2s infinite linear;\n  -moz-animation: spin 2s infinite linear;\n  -o-animation: spin 2s infinite linear;\n  -webkit-animation: spin 2s infinite linear;\n}\n.remixui_solidityCompileAndRunButton {\n  width: 94%;  \n}\n@keyframes spin {\n  0% { transform: rotate(0deg); }\n  100% { transform: rotate(360deg); }\n}\n.remixui_bouncingIcon {\n  display: inline-block;\n  position: relative;\n  animation: bounce 2s infinite linear;\n}\n@keyframes bounce {\n    0% { top: 0; }\n    50% { top: -0.2em; }\n    70% { top: -0.3em; }\n    100% { top: 0; }\n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN0eWxlLmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUNFLGdCQUFnQjtFQUNoQixpQkFBaUI7RUFDakIsa0JBQWtCO0FBQ3BCO0FBQ0E7RUFDRSxVQUFVO0VBQ1YsZUFBZTtBQUNqQjtBQUNBO0VBQ0UsYUFBYTtFQUNiLGNBQWM7RUFDZCxXQUFXO0VBQ1gsYUFBYTtBQUNmO0FBQ0E7RUFDRSxtQkFBbUI7QUFDckI7QUFDQTtFQUNFLGNBQWM7QUFDaEI7QUFDQTtFQUNFLGNBQWM7RUFDZCxXQUFXO0FBQ2I7QUFDQTtFQUNFLGFBQWE7RUFDYixzQkFBc0I7QUFDeEI7QUFDQTtFQUNFLGNBQWM7RUFDZCxZQUFZO0FBQ2Q7QUFDQTtFQUNFLGFBQWE7RUFDYixtQkFBbUI7RUFDbkIsbUJBQW1CO0FBQ3JCO0FBQ0E7RUFDRSxhQUFhO0VBQ2IsbUJBQW1CO0FBQ3JCO0FBQ0E7RUFDRSxVQUFVO0FBQ1o7QUFDQTtFQUNFLGFBQWE7RUFDYixtQkFBbUI7QUFDckI7QUFDQSxzQkFBc0I7QUFDdEI7RUFDRSxpQkFBaUI7RUFDakIsWUFBWTtBQUNkO0FBQ0E7RUFDRSxZQUFZO0VBQ1osZUFBZTtFQUNmLGdCQUFnQjtFQUNoQixrQkFBa0I7RUFDbEIsb0JBQW9CO0FBQ3RCO0FBQ0E7RUFDRSxlQUFlO0FBQ2pCO0FBQ0E7RUFDRSxhQUFhO0VBQ2IsbUJBQW1CO0FBQ3JCO0FBQ0E7RUFDRSxTQUFTO0FBQ1g7QUFDQTtFQUNFLHVCQUF1QjtBQUN6QjtBQUNBO0VBQ0UsZUFBZTtBQUNqQjtBQUNBO0VBQ0UsZUFBZTtBQUNqQjtBQUNBO0VBQ0UsZUFBZTtBQUNqQjtBQUNBO0VBQ0Usa0JBQWtCO0VBQ2xCLGVBQWU7RUFDZixpQkFBaUI7RUFDakIseUJBQXlCO0FBQzNCO0FBQ0E7RUFDRSxZQUFZO0VBQ1osaUJBQWlCO0VBQ2pCLGVBQWU7RUFDZixpQkFBaUI7QUFDbkI7QUFDQTtFQUNFLGFBQWE7QUFDZjtBQUNBO0VBQ0UsYUFBYTtBQUNmO0FBQ0E7RUFDRSxhQUFhO0VBQ2IsV0FBVztFQUNYLDhCQUE4QjtFQUM5QixlQUFlO0FBQ2pCO0FBQ0E7RUFDRSxXQUFXO0VBQ1gscUJBQXFCO0VBQ3JCLGVBQWU7QUFDakI7QUFDQTtFQUNFLFNBQVM7QUFDWDtBQUNBO0VBQ0UsYUFBYTtBQUNmO0FBQ0E7RUFDRSxhQUFhO0VBQ2IsdUJBQXVCO0VBQ3ZCLG1CQUFtQjtBQUNyQjtBQUNBO0VBQ0UsZUFBZTtFQUNmLGFBQWE7RUFDYixtQkFBbUI7RUFDbkIsOEJBQThCO0VBQzlCLFlBQVk7QUFDZDtBQUNBO0VBQ0UsZUFBZTtBQUNqQjtBQUNBO0VBQ0UsaUJBQWlCO0FBQ25CO0FBQ0E7RUFDRSxhQUFhO0VBQ2Isc0JBQXNCO0VBQ3RCLGlCQUFpQjtFQUNqQixpQkFBaUI7QUFDbkI7QUFDQTtFQUNFLGlCQUFpQjtFQUNqQix5QkFBeUI7RUFDekIsV0FBVztBQUNiO0FBQ0E7RUFDRSxhQUFhO0VBQ2IsV0FBVztFQUNYLGdCQUFnQjtBQUNsQjtBQUNBO0VBQ0UsZUFBZTtFQUNmLGVBQWU7QUFDakI7QUFDQTtBQUNBO0FBQ0E7RUFDRSxjQUFjO0VBQ2QsWUFBWTtBQUNkO0FBQ0E7RUFDRSxtQkFBbUI7QUFDckI7QUFDQTtFQUNFLGlCQUFpQjtFQUNqQixrQkFBa0I7RUFDbEIsc0JBQXNCO0FBQ3hCO0FBQ0E7RUFDRSxXQUFXO0VBQ1gsWUFBWTtBQUNkO0FBQ0E7RUFDRSxxQkFBcUI7RUFDckIsa0JBQWtCO0VBQ2xCLGtDQUFrQztFQUNsQyx1Q0FBdUM7RUFDdkMscUNBQXFDO0VBQ3JDLDBDQUEwQztBQUM1QztBQUVBO0VBQ0UsVUFBVTtBQUNaO0FBRUE7RUFDRSxLQUFLLHVCQUF1QixFQUFFO0VBQzlCLE9BQU8seUJBQXlCLEVBQUU7QUFDcEM7QUFrQkE7RUFDRSxxQkFBcUI7RUFDckIsa0JBQWtCO0VBSWxCLG9DQUFvQztBQUN0QztBQTBCQTtJQUNJLEtBQUssTUFBTSxFQUFFO0lBQ2IsTUFBTSxXQUFXLEVBQUU7SUFDbkIsTUFBTSxXQUFXLEVBQUU7SUFDbkIsT0FBTyxNQUFNLEVBQUU7QUFDbkIiLCJmaWxlIjoic3R5bGUuY3NzIiwic291cmNlc0NvbnRlbnQiOlsiLnJlbWl4dWlfdGl0bGUge1xuICBmb250LXNpemU6IDEuMWVtO1xuICBmb250LXdlaWdodDogYm9sZDtcbiAgbWFyZ2luLWJvdHRvbTogMWVtO1xufVxuLnJlbWl4dWlfcGFuaWNFcnJvciB7XG4gIGNvbG9yOiByZWQ7XG4gIGZvbnQtc2l6ZTogMjBweDtcbn1cbi5yZW1peHVpX2Nyb3cge1xuICBkaXNwbGF5OiBmbGV4O1xuICBvdmVyZmxvdzogYXV0bztcbiAgY2xlYXI6IGJvdGg7XG4gIHBhZGRpbmc6IC4yZW07XG59XG4ucmVtaXh1aV9jaGVja2JveFRleHQge1xuICBmb250LXdlaWdodDogbm9ybWFsO1xufVxuLnJlbWl4dWlfY3JvdyBsYWJlbCB7XG4gIGN1cnNvcjpwb2ludGVyO1xufVxuLnJlbWl4dWlfY3Jvd05vRmxleCB7XG4gIG92ZXJmbG93OiBhdXRvO1xuICBjbGVhcjogYm90aDtcbn1cbi5yZW1peHVpX2luZm8ge1xuICBwYWRkaW5nOiAxMHB4O1xuICB3b3JkLWJyZWFrOiBicmVhay13b3JkO1xufVxuLnJlbWl4dWlfY29udHJhY3Qge1xuICBkaXNwbGF5OiBibG9jaztcbiAgbWFyZ2luOiAzJSAwO1xufVxuLnJlbWl4dWlfbmlnaHRseUJ1aWxkcyB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiByb3c7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG59XG4ucmVtaXh1aV9hdXRvY29tcGlsZUNvbnRhaW5lciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG59XG4ucmVtaXh1aV9ydW5zIHtcbiAgd2lkdGg6IDQwJTtcbn1cbi5yZW1peHVpX2hpZGVXYXJuaW5nc0NvbnRhaW5lciB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG59XG4ucmVtaXh1aV9hdXRvY29tcGlsZSB7fVxuLnJlbWl4dWlfYXV0b2NvbXBpbGVUaXRsZSB7XG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xuICBtYXJnaW46IDElIDA7XG59XG4ucmVtaXh1aV9hdXRvY29tcGlsZVRleHQge1xuICBtYXJnaW46IDElIDA7XG4gIGZvbnQtc2l6ZTogMTJweDtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgd29yZC1icmVhazogbm9ybWFsO1xuICBsaW5lLWhlaWdodDogaW5pdGlhbDtcbn1cbi5yZW1peHVpX3dhcm5Db21waWxhdGlvblNsb3cge1xuICBtYXJnaW4tbGVmdDogMSU7XG59XG4ucmVtaXh1aV9jb21waWxlckNvbmZpZyB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG59XG4ucmVtaXh1aV9jb21waWxlckNvbmZpZyBsYWJlbCB7XG4gIG1hcmdpbjogMDtcbn1cbi5yZW1peHVpX2NvbXBpbGVyU2VjdGlvbiB7XG4gIHBhZGRpbmc6IDEycHggMjRweCAxNnB4O1xufVxuLnJlbWl4dWlfY29tcGlsZXJDb25maWdTZWN0aW9uOmhvdmVyIHtcbiAgY3Vyc29yOiBwb2ludGVyO1xufVxuLnJlbWl4dWlfY29tcGlsZXJDb25maWdTZWN0aW9uIHtcbiAgZm9udC1zaXplOiAxcmVtO1xufVxuLnJlbWl4dWlfY29tcGlsZXJDb25maWdQYXRoIHtcbiAgY3Vyc29yOiBwb2ludGVyO1xufVxuLnJlbWl4dWlfY29tcGlsZXJMYWJlbCB7XG4gIG1hcmdpbi1ib3R0b206IDJweDtcbiAgZm9udC1zaXplOiAxMXB4O1xuICBsaW5lLWhlaWdodDogMTJweDtcbiAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTtcbn1cbi5yZW1peHVpX2NvcHlCdXR0b24ge1xuICBwYWRkaW5nOiA2cHg7XG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xuICBmb250LXNpemU6IDExcHg7XG4gIGxpbmUtaGVpZ2h0OiAxNXB4O1xufVxuLnJlbWl4dWlfbmFtZSB7XG4gIGRpc3BsYXk6IGZsZXg7XG59XG4ucmVtaXh1aV9zaXplIHtcbiAgZGlzcGxheTogZmxleDtcbn1cbi5yZW1peHVpX2NoZWNrYm94ZXMge1xuICBkaXNwbGF5OiBmbGV4O1xuICB3aWR0aDogMTAwJTtcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuICBmbGV4LXdyYXA6IHdyYXA7XG59XG4ucmVtaXh1aV9jb21waWxlQnV0dG9uIHtcbiAgd2lkdGg6IDEwMCU7XG4gIG1hcmdpbjogMTVweCAwIDEwcHggMDtcbiAgZm9udC1zaXplOiAxMnB4O1xufVxuLnJlbWl4dWlfY29udGFpbmVyIHtcbiAgbWFyZ2luOiAwO1xufVxuLnJlbWl4dWlfb3B0aW1pemVDb250YWluZXIge1xuICBkaXNwbGF5OiBmbGV4O1xufVxuLnJlbWl4dWlfbm9Db250cmFjdEFsZXJ0IHtcbiAgZGlzcGxheTogZmxleDtcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG59XG4ucmVtaXh1aV9jb250cmFjdEhlbHBlckJ1dHRvbnMge1xuICBtYXJnaW4tdG9wOiA2cHg7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgZmxvYXQ6IHJpZ2h0O1xufVxuLnJlbWl4dWlfY29weVRvQ2xpcGJvYXJkIHtcbiAgZm9udC1zaXplOiAxcmVtO1xufVxuLnJlbWl4dWlfY29weUljb24ge1xuICBtYXJnaW4tcmlnaHQ6IDVweDtcbn1cbi5yZW1peHVpX2xvZyB7XG4gIGRpc3BsYXk6IGZsZXg7XG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG4gIG1hcmdpbi1ib3R0b206IDUlO1xuICBvdmVyZmxvdzogdmlzaWJsZTtcbn1cbi5yZW1peHVpX2tleSB7XG4gIG1hcmdpbi1yaWdodDogNXB4O1xuICB0ZXh0LXRyYW5zZm9ybTogdXBwZXJjYXNlO1xuICB3aWR0aDogMTAwJTtcbn1cbi5yZW1peHVpX3ZhbHVlIHtcbiAgZGlzcGxheTogZmxleDtcbiAgd2lkdGg6IDEwMCU7XG4gIG1hcmdpbi10b3A6IDEuNSU7XG59XG4ucmVtaXh1aV9xdWVzdGlvbk1hcmsge1xuICBtYXJnaW4tbGVmdDogMiU7XG4gIGN1cnNvcjogcG9pbnRlcjtcbn1cbi5yZW1peHVpX3F1ZXN0aW9uTWFyazpob3ZlciB7XG59XG4ucmVtaXh1aV9kZXRhaWxzSlNPTiB7XG4gIHBhZGRpbmc6IDhweCAwO1xuICBib3JkZXI6IG5vbmU7XG59XG4ucmVtaXh1aV9pY29uYnRuIHtcbiAgbWFyZ2luLXJpZ2h0OiAwLjNlbTtcbn1cbi5yZW1peHVpX2Vycm9yQmxvYnMge1xuICBwYWRkaW5nLWxlZnQ6IDVweDtcbiAgcGFkZGluZy1yaWdodDogNXB4O1xuICB3b3JkLWJyZWFrOiBicmVhay13b3JkO1xufVxuLnJlbWl4dWlfc3RvcmFnZUxvZ28ge1xuICB3aWR0aDogMjBweDtcbiAgaGVpZ2h0OiAyMHB4O1xufVxuLnJlbWl4dWlfc3Bpbm5pbmdJY29uIHtcbiAgZGlzcGxheTogaW5saW5lLWJsb2NrO1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGFuaW1hdGlvbjogc3BpbiAycyBpbmZpbml0ZSBsaW5lYXI7XG4gIC1tb3otYW5pbWF0aW9uOiBzcGluIDJzIGluZmluaXRlIGxpbmVhcjtcbiAgLW8tYW5pbWF0aW9uOiBzcGluIDJzIGluZmluaXRlIGxpbmVhcjtcbiAgLXdlYmtpdC1hbmltYXRpb246IHNwaW4gMnMgaW5maW5pdGUgbGluZWFyO1xufVxuXG4ucmVtaXh1aV9zb2xpZGl0eUNvbXBpbGVBbmRSdW5CdXR0b24ge1xuICB3aWR0aDogOTQlOyAgXG59XG5cbkBrZXlmcmFtZXMgc3BpbiB7XG4gIDAlIHsgdHJhbnNmb3JtOiByb3RhdGUoMGRlZyk7IH1cbiAgMTAwJSB7IHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IH1cbn1cbkAtd2Via2l0LWtleWZyYW1lcyBzcGluIHtcbiAgMCUgeyB0cmFuc2Zvcm06IHJvdGF0ZSgwZGVnKTsgfVxuICAxMDAlIHsgdHJhbnNmb3JtOiByb3RhdGUoMzYwZGVnKTsgfVxufVxuQC1tb3ota2V5ZnJhbWVzIHNwaW4ge1xuICAwJSB7IHRyYW5zZm9ybTogcm90YXRlKDBkZWcpOyB9XG4gIDEwMCUgeyB0cmFuc2Zvcm06IHJvdGF0ZSgzNjBkZWcpOyB9XG59XG5ALW8ta2V5ZnJhbWVzIHNwaW4ge1xuICAgIDAlIHsgdHJhbnNmb3JtOiByb3RhdGUoMGRlZyk7IH1cbiAgMTAwJSB7IHRyYW5zZm9ybTogcm90YXRlKDM2MGRlZyk7IH1cbn1cbkAtbXMta2V5ZnJhbWVzIHNwaW4ge1xuICAwJSB7IHRyYW5zZm9ybTogcm90YXRlKDBkZWcpOyB9XG4gIDEwMCUgeyB0cmFuc2Zvcm06IHJvdGF0ZSgzNjBkZWcpOyB9XG59XG5cbi5yZW1peHVpX2JvdW5jaW5nSWNvbiB7XG4gIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAtbW96LWFuaW1hdGlvbjogYm91bmNlIDJzIGluZmluaXRlIGxpbmVhcjtcbiAgLW8tYW5pbWF0aW9uOiBib3VuY2UgMnMgaW5maW5pdGUgbGluZWFyO1xuICAtd2Via2l0LWFuaW1hdGlvbjogYm91bmNlIDJzIGluZmluaXRlIGxpbmVhcjtcbiAgYW5pbWF0aW9uOiBib3VuY2UgMnMgaW5maW5pdGUgbGluZWFyO1xufSBcblxuQC13ZWJraXQta2V5ZnJhbWVzIGJvdW5jZSB7XG4gICAgMCUgeyB0b3A6IDA7IH1cbiAgICA1MCUgeyB0b3A6IC0wLjJlbTsgfVxuICAgIDcwJSB7IHRvcDogLTAuM2VtOyB9XG4gICAgMTAwJSB7IHRvcDogMDsgfVxufVxuQC1tb3ota2V5ZnJhbWVzIGJvdW5jZSB7XG4gICAgMCUgeyB0b3A6IDA7IH1cbiAgICA1MCUgeyB0b3A6IC0wLjJlbTsgfVxuICAgIDcwJSB7IHRvcDogLTAuM2VtOyB9XG4gICAgMTAwJSB7IHRvcDogMDsgfVxufVxuQC1vLWtleWZyYW1lcyBib3VuY2Uge1xuICAgIDAlIHsgdG9wOiAwOyB9XG4gICAgNTAlIHsgdG9wOiAtMC4yZW07IH1cbiAgICA3MCUgeyB0b3A6IC0wLjNlbTsgfVxuICAgIDEwMCUgeyB0b3A6IDA7IH1cbn1cbkAtbXMta2V5ZnJhbWVzIGJvdW5jZSB7XG4gICAgMCUgeyB0b3A6IDA7IH1cbiAgICA1MCUgeyB0b3A6IC0wLjJlbTsgfVxuICAgIDcwJSB7IHRvcDogLTAuM2VtOyB9XG4gICAgMTAwJSB7IHRvcDogMDsgfVxufVxuQGtleWZyYW1lcyBib3VuY2Uge1xuICAgIDAlIHsgdG9wOiAwOyB9XG4gICAgNTAlIHsgdG9wOiAtMC4yZW07IH1cbiAgICA3MCUgeyB0b3A6IC0wLjNlbTsgfVxuICAgIDEwMCUgeyB0b3A6IDA7IH1cbn1cbiJdfQ== */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/toaster/src/lib/toaster.css":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/toaster/src/lib/toaster.css ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".remixui_tooltip {\n    z-index: 1001;\n    display: flex;\n    justify-content: space-between;\n    align-items: center;\n    position: fixed;\n    min-height: 50px;\n    padding: 16px 24px 12px;\n    border-radius: 3px;\n    left: 40%;\n    font-size: 14px;\n    text-align: center;\n    bottom: -0px;\n    flex-direction: row;\n}\n@keyframes remixui_animatebottom  {\n  0% {bottom: -300px}\n  100% {bottom: 0px}\n}\n@keyframes remixui_animatetop  {\n  0% {bottom: 0px}\n  100% {bottom: -300px}\n}\n.remixui_animateTop {\n  -webkit-animation-name: remixui_animatetop;\n  -webkit-animation-duration: 2s;\n  animation-name: remixui_animatetop;\n  animation-duration: 2s;\n}\n.remixui_animateBottom {\n  -webkit-animation-name: remixui_animatebottom;\n  -webkit-animation-duration: 2s;\n  animation-name: remixui_animatebottom;\n  animation-duration: 2s;    \n}\n\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRvYXN0ZXIuY3NzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0lBQ0ksYUFBYTtJQUNiLGFBQWE7SUFDYiw4QkFBOEI7SUFDOUIsbUJBQW1CO0lBQ25CLGVBQWU7SUFDZixnQkFBZ0I7SUFDaEIsdUJBQXVCO0lBQ3ZCLGtCQUFrQjtJQUNsQixTQUFTO0lBQ1QsZUFBZTtJQUNmLGtCQUFrQjtJQUNsQixZQUFZO0lBQ1osbUJBQW1CO0FBQ3ZCO0FBS0E7RUFDRSxJQUFJLGNBQWM7RUFDbEIsTUFBTSxXQUFXO0FBQ25CO0FBS0E7RUFDRSxJQUFJLFdBQVc7RUFDZixNQUFNLGNBQWM7QUFDdEI7QUFDQTtFQUNFLDBDQUEwQztFQUMxQyw4QkFBOEI7RUFDOUIsa0NBQWtDO0VBQ2xDLHNCQUFzQjtBQUN4QjtBQUNBO0VBQ0UsNkNBQTZDO0VBQzdDLDhCQUE4QjtFQUM5QixxQ0FBcUM7RUFDckMsc0JBQXNCO0FBQ3hCIiwiZmlsZSI6InRvYXN0ZXIuY3NzIiwic291cmNlc0NvbnRlbnQiOlsiLnJlbWl4dWlfdG9vbHRpcCB7XG4gICAgei1pbmRleDogMTAwMTtcbiAgICBkaXNwbGF5OiBmbGV4O1xuICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcbiAgICBhbGlnbi1pdGVtczogY2VudGVyO1xuICAgIHBvc2l0aW9uOiBmaXhlZDtcbiAgICBtaW4taGVpZ2h0OiA1MHB4O1xuICAgIHBhZGRpbmc6IDE2cHggMjRweCAxMnB4O1xuICAgIGJvcmRlci1yYWRpdXM6IDNweDtcbiAgICBsZWZ0OiA0MCU7XG4gICAgZm9udC1zaXplOiAxNHB4O1xuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICBib3R0b206IC0wcHg7XG4gICAgZmxleC1kaXJlY3Rpb246IHJvdztcbn1cbkAtd2Via2l0LWtleWZyYW1lcyByZW1peHVpX2FuaW1hdGVib3R0b20gIHtcbiAgMCUge2JvdHRvbTogLTMwMHB4fVxuICAxMDAlIHtib3R0b206IDBweH1cbn1cbkBrZXlmcmFtZXMgcmVtaXh1aV9hbmltYXRlYm90dG9tICB7XG4gIDAlIHtib3R0b206IC0zMDBweH1cbiAgMTAwJSB7Ym90dG9tOiAwcHh9XG59XG5ALXdlYmtpdC1rZXlmcmFtZXMgcmVtaXh1aV9hbmltYXRldG9wICB7XG4gIDAlIHtib3R0b206IDBweH1cbiAgMTAwJSB7Ym90dG9tOiAtMzAwcHh9XG59XG5Aa2V5ZnJhbWVzIHJlbWl4dWlfYW5pbWF0ZXRvcCAge1xuICAwJSB7Ym90dG9tOiAwcHh9XG4gIDEwMCUge2JvdHRvbTogLTMwMHB4fVxufVxuLnJlbWl4dWlfYW5pbWF0ZVRvcCB7XG4gIC13ZWJraXQtYW5pbWF0aW9uLW5hbWU6IHJlbWl4dWlfYW5pbWF0ZXRvcDtcbiAgLXdlYmtpdC1hbmltYXRpb24tZHVyYXRpb246IDJzO1xuICBhbmltYXRpb24tbmFtZTogcmVtaXh1aV9hbmltYXRldG9wO1xuICBhbmltYXRpb24tZHVyYXRpb246IDJzO1xufVxuLnJlbWl4dWlfYW5pbWF0ZUJvdHRvbSB7XG4gIC13ZWJraXQtYW5pbWF0aW9uLW5hbWU6IHJlbWl4dWlfYW5pbWF0ZWJvdHRvbTtcbiAgLXdlYmtpdC1hbmltYXRpb24tZHVyYXRpb246IDJzO1xuICBhbmltYXRpb24tbmFtZTogcmVtaXh1aV9hbmltYXRlYm90dG9tO1xuICBhbmltYXRpb24tZHVyYXRpb246IDJzOyAgICBcbn1cbiJdfQ== */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.css":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/lib/remix-ui-tree-view.css ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, ".li_tv {\n    list-style-type: none;\n    -webkit-margin-before: 0px;\n    -webkit-margin-after: 0px;\n    -webkit-margin-start: 0px;\n    -webkit-margin-end: 0px;\n    -webkit-padding-start: 0px;\n  }\n  .ul_tv {\n    list-style-type: none;\n    -webkit-margin-before: 0px;\n    -webkit-margin-after: 0px;\n    -webkit-margin-start: 0px;\n    -webkit-margin-end: 0px;\n    -webkit-padding-start: 0px;\n  }\n  .caret_tv {\n    width: 10px;\n    flex-shrink: 0;\n    padding-right: 5px;\n  }\n  .label_item {\n    word-break: break-all;\n    max-width: 90%;\n  }\n  .label_key {\n    max-width: 65%;\n    word-break: break-word;\n    min-width: -moz-fit-content;\n    min-width: fit-content;\n  }\n  .label_value {\n    min-width: 10%;\n  }\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlbWl4LXVpLXRyZWUtdmlldy5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7SUFDSSxxQkFBcUI7SUFDckIsMEJBQTBCO0lBQzFCLHlCQUF5QjtJQUN6Qix5QkFBeUI7SUFDekIsdUJBQXVCO0lBQ3ZCLDBCQUEwQjtFQUM1QjtFQUNBO0lBQ0UscUJBQXFCO0lBQ3JCLDBCQUEwQjtJQUMxQix5QkFBeUI7SUFDekIseUJBQXlCO0lBQ3pCLHVCQUF1QjtJQUN2QiwwQkFBMEI7RUFDNUI7RUFDQTtJQUNFLFdBQVc7SUFDWCxjQUFjO0lBQ2Qsa0JBQWtCO0VBQ3BCO0VBQ0E7SUFDRSxxQkFBcUI7SUFDckIsY0FBYztFQUNoQjtFQUNBO0lBQ0UsY0FBYztJQUNkLHNCQUFzQjtJQUN0QiwyQkFBc0I7SUFBdEIsc0JBQXNCO0VBQ3hCO0VBQ0E7SUFDRSxjQUFjO0VBQ2hCIiwiZmlsZSI6InJlbWl4LXVpLXRyZWUtdmlldy5jc3MiLCJzb3VyY2VzQ29udGVudCI6WyIubGlfdHYge1xuICAgIGxpc3Qtc3R5bGUtdHlwZTogbm9uZTtcbiAgICAtd2Via2l0LW1hcmdpbi1iZWZvcmU6IDBweDtcbiAgICAtd2Via2l0LW1hcmdpbi1hZnRlcjogMHB4O1xuICAgIC13ZWJraXQtbWFyZ2luLXN0YXJ0OiAwcHg7XG4gICAgLXdlYmtpdC1tYXJnaW4tZW5kOiAwcHg7XG4gICAgLXdlYmtpdC1wYWRkaW5nLXN0YXJ0OiAwcHg7XG4gIH1cbiAgLnVsX3R2IHtcbiAgICBsaXN0LXN0eWxlLXR5cGU6IG5vbmU7XG4gICAgLXdlYmtpdC1tYXJnaW4tYmVmb3JlOiAwcHg7XG4gICAgLXdlYmtpdC1tYXJnaW4tYWZ0ZXI6IDBweDtcbiAgICAtd2Via2l0LW1hcmdpbi1zdGFydDogMHB4O1xuICAgIC13ZWJraXQtbWFyZ2luLWVuZDogMHB4O1xuICAgIC13ZWJraXQtcGFkZGluZy1zdGFydDogMHB4O1xuICB9XG4gIC5jYXJldF90diB7XG4gICAgd2lkdGg6IDEwcHg7XG4gICAgZmxleC1zaHJpbms6IDA7XG4gICAgcGFkZGluZy1yaWdodDogNXB4O1xuICB9XG4gIC5sYWJlbF9pdGVtIHtcbiAgICB3b3JkLWJyZWFrOiBicmVhay1hbGw7XG4gICAgbWF4LXdpZHRoOiA5MCU7XG4gIH1cbiAgLmxhYmVsX2tleSB7XG4gICAgbWF4LXdpZHRoOiA2NSU7XG4gICAgd29yZC1icmVhazogYnJlYWstd29yZDtcbiAgICBtaW4td2lkdGg6IGZpdC1jb250ZW50O1xuICB9XG4gIC5sYWJlbF92YWx1ZSB7XG4gICAgbWluLXdpZHRoOiAxMCU7XG4gIH0iXX0= */", '', '']]

/***/ }),

/***/ "../../../node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!../../../node_modules/postcss-loader/dist/cjs.js?!../../../libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.css":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/src/utils/third-party/cli-files/plugins/raw-css-loader.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/postcss-loader/dist/cjs.js??ref--5-oneOf-4-2!/Users/ovi/Desktop/micovi/remix-project/libs/remix-ui/tree-view/src/lib/tree-view-item/tree-view-item.css ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = [[module.i, "\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJ0cmVlLXZpZXctaXRlbS5jc3MifQ== */", '', '']]

/***/ }),

/***/ "../../../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!******************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \******************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var stylesInDom = {};

var isOldIE = function isOldIE() {
  var memo;
  return function memorize() {
    if (typeof memo === 'undefined') {
      // Test for IE <= 9 as proposed by Browserhacks
      // @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
      // Tests for existence of standard globals is to allow style-loader
      // to operate correctly into non-standard environments
      // @see https://github.com/webpack-contrib/style-loader/issues/177
      memo = Boolean(window && document && document.all && !window.atob);
    }

    return memo;
  };
}();

var getTarget = function getTarget() {
  var memo = {};
  return function memorize(target) {
    if (typeof memo[target] === 'undefined') {
      var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

      if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
        try {
          // This will throw an exception if access to iframe is blocked
          // due to cross-origin restrictions
          styleTarget = styleTarget.contentDocument.head;
        } catch (e) {
          // istanbul ignore next
          styleTarget = null;
        }
      }

      memo[target] = styleTarget;
    }

    return memo[target];
  };
}();

function listToStyles(list, options) {
  var styles = [];
  var newStyles = {};

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var css = item[1];
    var media = item[2];
    var sourceMap = item[3];
    var part = {
      css: css,
      media: media,
      sourceMap: sourceMap
    };

    if (!newStyles[id]) {
      styles.push(newStyles[id] = {
        id: id,
        parts: [part]
      });
    } else {
      newStyles[id].parts.push(part);
    }
  }

  return styles;
}

function addStylesToDom(styles, options) {
  for (var i = 0; i < styles.length; i++) {
    var item = styles[i];
    var domStyle = stylesInDom[item.id];
    var j = 0;

    if (domStyle) {
      domStyle.refs++;

      for (; j < domStyle.parts.length; j++) {
        domStyle.parts[j](item.parts[j]);
      }

      for (; j < item.parts.length; j++) {
        domStyle.parts.push(addStyle(item.parts[j], options));
      }
    } else {
      var parts = [];

      for (; j < item.parts.length; j++) {
        parts.push(addStyle(item.parts[j], options));
      }

      stylesInDom[item.id] = {
        id: item.id,
        refs: 1,
        parts: parts
      };
    }
  }
}

function insertStyleElement(options) {
  var style = document.createElement('style');

  if (typeof options.attributes.nonce === 'undefined') {
    var nonce =  true ? __webpack_require__.nc : undefined;

    if (nonce) {
      options.attributes.nonce = nonce;
    }
  }

  Object.keys(options.attributes).forEach(function (key) {
    style.setAttribute(key, options.attributes[key]);
  });

  if (typeof options.insert === 'function') {
    options.insert(style);
  } else {
    var target = getTarget(options.insert || 'head');

    if (!target) {
      throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
    }

    target.appendChild(style);
  }

  return style;
}

function removeStyleElement(style) {
  // istanbul ignore if
  if (style.parentNode === null) {
    return false;
  }

  style.parentNode.removeChild(style);
}
/* istanbul ignore next  */


var replaceText = function replaceText() {
  var textStore = [];
  return function replace(index, replacement) {
    textStore[index] = replacement;
    return textStore.filter(Boolean).join('\n');
  };
}();

function applyToSingletonTag(style, index, remove, obj) {
  var css = remove ? '' : obj.css; // For old IE

  /* istanbul ignore if  */

  if (style.styleSheet) {
    style.styleSheet.cssText = replaceText(index, css);
  } else {
    var cssNode = document.createTextNode(css);
    var childNodes = style.childNodes;

    if (childNodes[index]) {
      style.removeChild(childNodes[index]);
    }

    if (childNodes.length) {
      style.insertBefore(cssNode, childNodes[index]);
    } else {
      style.appendChild(cssNode);
    }
  }
}

function applyToTag(style, options, obj) {
  var css = obj.css;
  var media = obj.media;
  var sourceMap = obj.sourceMap;

  if (media) {
    style.setAttribute('media', media);
  }

  if (sourceMap && btoa) {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    while (style.firstChild) {
      style.removeChild(style.firstChild);
    }

    style.appendChild(document.createTextNode(css));
  }
}

var singleton = null;
var singletonCounter = 0;

function addStyle(obj, options) {
  var style;
  var update;
  var remove;

  if (options.singleton) {
    var styleIndex = singletonCounter++;
    style = singleton || (singleton = insertStyleElement(options));
    update = applyToSingletonTag.bind(null, style, styleIndex, false);
    remove = applyToSingletonTag.bind(null, style, styleIndex, true);
  } else {
    style = insertStyleElement(options);
    update = applyToTag.bind(null, style, options);

    remove = function remove() {
      removeStyleElement(style);
    };
  }

  update(obj);
  return function updateStyle(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap) {
        return;
      }

      update(obj = newObj);
    } else {
      remove();
    }
  };
}

module.exports = function (list, options) {
  options = options || {};
  options.attributes = typeof options.attributes === 'object' ? options.attributes : {}; // Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
  // tags it will allow on a page

  if (!options.singleton && typeof options.singleton !== 'boolean') {
    options.singleton = isOldIE();
  }

  var styles = listToStyles(list, options);
  addStylesToDom(styles, options);
  return function update(newList) {
    var mayRemove = [];

    for (var i = 0; i < styles.length; i++) {
      var item = styles[i];
      var domStyle = stylesInDom[item.id];

      if (domStyle) {
        domStyle.refs--;
        mayRemove.push(domStyle);
      }
    }

    if (newList) {
      var newStyles = listToStyles(newList, options);
      addStylesToDom(newStyles, options);
    }

    for (var _i = 0; _i < mayRemove.length; _i++) {
      var _domStyle = mayRemove[_i];

      if (_domStyle.refs === 0) {
        for (var j = 0; j < _domStyle.parts.length; j++) {
          _domStyle.parts[j]();
        }

        delete stylesInDom[_domStyle.id];
      }
    }
  };
};

/***/ }),

/***/ "../../../node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "./app/app.tsx":
/*!*********************!*\
  !*** ./app/app.tsx ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.App = void 0;
var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _solidityCompiler = __webpack_require__(/*! @remix-ui/solidity-compiler */ "../../../libs/remix-ui/solidity-compiler/src/index.ts");
var _compiler = __webpack_require__(/*! ./compiler */ "./app/compiler.ts");
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/apps/solidity-compiler/src/app/app.tsx";
const remix = new _compiler.CompilerClientApi();
const App = () => {
  return /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)("div", {
    children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_solidityCompiler.SolidityCompiler, {
      api: remix
    }, void 0, false, {
      fileName: _jsxFileName,
      lineNumber: 13,
      columnNumber: 7
    }, void 0)
  }, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 12,
    columnNumber: 5
  }, void 0);
};
exports.App = App;
var _default = App;
exports.default = _default;

/***/ }),

/***/ "./app/compiler-api.ts":
/*!*****************************!*\
  !*** ./app/compiler-api.ts ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CompilerApiMixin = void 0;
var _defineProperty2 = _interopRequireDefault(__webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/esm/defineProperty.js"));
var _remixSolidity = __webpack_require__(/*! @remix-project/remix-solidity */ "../../../dist/libs/remix-solidity/src/index.js");
var _solidityCompiler = __webpack_require__(/*! @remix-ui/solidity-compiler */ "../../../libs/remix-ui/solidity-compiler/src/index.ts");
const CompilerApiMixin = Base => class extends Base {
  constructor(...args) {
    super(...args);
    (0, _defineProperty2.default)(this, "currentFile", void 0);
    (0, _defineProperty2.default)(this, "compilationDetails", void 0);
    (0, _defineProperty2.default)(this, "compileErrors", void 0);
    (0, _defineProperty2.default)(this, "compileTabLogic", void 0);
    (0, _defineProperty2.default)(this, "configurationSettings", void 0);
    (0, _defineProperty2.default)(this, "onCurrentFileChanged", void 0);
    (0, _defineProperty2.default)(this, "onSetWorkspace", void 0);
    (0, _defineProperty2.default)(this, "onFileRemoved", void 0);
    (0, _defineProperty2.default)(this, "onNoFileSelected", void 0);
    (0, _defineProperty2.default)(this, "onCompilationFinished", void 0);
    (0, _defineProperty2.default)(this, "onSessionSwitched", void 0);
    (0, _defineProperty2.default)(this, "onContentChanged", void 0);
    (0, _defineProperty2.default)(this, "onFileClosed", void 0);
    (0, _defineProperty2.default)(this, "statusChanged", void 0);
  }
  initCompilerApi() {
    this.configurationSettings = null;
    this._view = {
      warnCompilationSlow: null,
      errorContainer: null,
      contractEl: null
    };
    this.compilationDetails = {
      contractsDetails: {},
      contractMap: {}
    };
    this.data = {
      eventHandlers: {},
      loading: false
    };
    this.compileErrors = {};
    this.compiledFileName = '';
    this.currentFile = '';
  }
  onActivation() {
    this.listenToEvents();
  }
  onDeactivation() {
    this.off('editor', 'contentChanged');
    if (this.data.eventHandlers.onLoadingCompiler) {
      this.compiler.event.unregister('loadingCompiler', this.data.eventHandlers.onLoadingCompiler);
    }
    if (this.data.eventHandlers.onCompilerLoaded) {
      this.compiler.event.unregister('compilerLoaded', this.data.eventHandlers.onCompilerLoaded);
    }
    if (this.data.eventHandlers.onCompilationFinished) {
      this.compiler.event.unregister('compilationFinished', this.data.eventHandlers.onCompilationFinished);
    }
    this.off('filePanel', 'setWorkspace');
    this.off('remixd', 'rootFolderChanged');
    this.off('editor', 'sessionSwitched');
    if (this.data.eventHandlers.onStartingCompilation) {
      this.compileTabLogic.event.off('startingCompilation', this.data.eventHandlers.onStartingCompilation);
    }
    if (this.data.eventHandlers.onRemoveAnnotations) {
      this.compileTabLogic.event.off('removeAnnotations', this.data.eventHandlers.onRemoveAnnotations);
    }
    this.off('fileManager', 'currentFileChanged');
    this.off('fileManager', 'noFileSelected');
    this.off('themeModule', 'themeChanged');
    if (this.data.eventHandlers.onKeyDown) {
      window.document.removeEventListener('keydown', this.data.eventHandlers.onKeyDown);
    }
  }
  resolveContentAndSave(url) {
    return this.call('contentImport', 'resolveAndSave', url);
  }
  runScriptAfterCompilation(fileName) {
    this.call('compileAndRun', 'runScriptAfterCompilation', fileName);
  }
  compileWithHardhat(configFile) {
    return this.call('hardhat', 'compile', configFile);
  }
  compileWithTruffle(configFile) {
    return this.call('truffle', 'compile', configFile);
  }
  logToTerminal(content) {
    return this.call('terminal', 'log', content);
  }
  getCompilationResult() {
    return this.compileTabLogic.compiler.state.lastCompilationResult;
  }
  getCompilerState() {
    return this.compileTabLogic.getCompilerState();
  }

  /**
   * compile using @arg fileName.
   * The module UI will be updated accordingly to the new compilation result.
   * This function is used by remix-plugin compiler API.
   * @param {string} fileName to compile
   */
  compile(fileName) {
    this.currentFile = fileName;
    return this.compileTabLogic.compileFile(fileName);
  }
  compileFile(event) {
    if (event.path.length > 0) {
      this.currentFile = event.path[0];
      this.compileTabLogic.compileFile(event.path[0]);
    }
  }

  /**
   * compile using @arg compilationTargets and @arg settings
   * The module UI will *not* be updated, the compilation result is returned
   * This function is used by remix-plugin compiler API.
   * @param {object} map of source files.
   * @param {object} settings {evmVersion, optimize, runs, version, language}
   */
  async compileWithParameters(compilationTargets, settings) {
    const compilerState = this.getCompilerState();
    settings.version = settings.version || compilerState.currentVersion;
    const res = await (0, _remixSolidity.compile)(compilationTargets, settings, (url, cb) => this.call('contentImport', 'resolveAndSave', url).then(result => cb(null, result)).catch(error => cb(error.message)));
    return res;
  }

  // This function is used for passing the compiler configuration to 'remix-tests'
  getCurrentCompilerConfig() {
    const compilerState = this.getCompilerState();
    const compilerDetails = {
      currentVersion: compilerState.currentVersion,
      evmVersion: compilerState.evmVersion,
      optimize: compilerState.optimize,
      runs: compilerState.runs
    };
    if (this.data.loading) {
      compilerDetails.currentVersion = this.data.loadingUrl;
      compilerDetails.isUrl = true;
    }
    return compilerDetails;
  }

  /**
   * set the compiler configuration
   * This function is used by remix-plugin compiler API.
   * @param {object} settings {evmVersion, optimize, runs, version, language}
   */
  setCompilerConfig(settings) {
    this.configurationSettings = settings;
  }
  fileExists(fileName) {
    return this.call('fileManager', 'exists', fileName);
  }
  writeFile(fileName, content) {
    return this.call('fileManager', 'writeFile', fileName, content);
  }
  readFile(fileName) {
    return this.call('fileManager', 'readFile', fileName);
  }
  open(fileName) {
    return this.call('fileManager', 'open', fileName);
  }
  saveCurrentFile() {
    return this.call('fileManager', 'saveCurrentFile');
  }
  resetResults() {
    this.currentFile = '';
    this.compilationDetails = {
      contractsDetails: {},
      contractMap: {}
    };
    this.statusChanged({
      key: 'none'
    });
    // if (this.onResetResults) this.onResetResults()
  }

  listenToEvents() {
    var _this = this;
    this.on('editor', 'contentChanged', () => {
      this.statusChanged({
        key: 'edited',
        title: 'the content has changed, needs recompilation',
        type: 'info'
      });
      if (this.onContentChanged) this.onContentChanged();
    });
    this.data.eventHandlers.onLoadingCompiler = url => {
      this.data.loading = true;
      this.data.loadingUrl = url;
      this.statusChanged({
        key: 'loading',
        title: 'loading compiler...',
        type: 'info'
      });
      this.emit('loadingCompiler', url);
    };
    this.compiler.event.register('loadingCompiler', this.data.eventHandlers.onLoadingCompiler);
    this.data.eventHandlers.onCompilerLoaded = (version, license) => {
      this.data.loading = false;
      this.statusChanged({
        key: 'none'
      });
      this.emit('compilerLoaded', version, license);
    };
    this.compiler.event.register('compilerLoaded', this.data.eventHandlers.onCompilerLoaded);
    this.data.eventHandlers.onStartingCompilation = () => {
      this.statusChanged({
        key: 'loading',
        title: 'compiling...',
        type: 'info'
      });
    };
    this.data.eventHandlers.onRemoveAnnotations = () => {
      this.call('editor', 'clearAnnotations');
    };
    this.on('filePanel', 'setWorkspace', workspace => {
      this.resetResults();
      if (this.onSetWorkspace) this.onSetWorkspace(workspace.isLocalhost, workspace.name);
    });
    this.on('fileManager', 'fileRemoved', path => {
      if (this.onFileRemoved) this.onFileRemoved(path);
    });
    this.on('remixd', 'rootFolderChanged', () => {
      this.resetResults();
      if (this.onSetWorkspace) this.onSetWorkspace(true, 'localhost');
    });
    this.on('editor', 'sessionSwitched', () => {
      if (this.onSessionSwitched) this.onSessionSwitched();
    });
    this.compileTabLogic.event.on('startingCompilation', this.data.eventHandlers.onStartingCompilation);
    this.compileTabLogic.event.on('removeAnnotations', this.data.eventHandlers.onRemoveAnnotations);
    this.data.eventHandlers.onCurrentFileChanged = name => {
      this.currentFile = name;
      if (this.onCurrentFileChanged) this.onCurrentFileChanged(name);
    };
    this.on('fileManager', 'currentFileChanged', this.data.eventHandlers.onCurrentFileChanged);
    this.data.eventHandlers.onNoFileSelected = () => {
      this.currentFile = '';
      if (this.onNoFileSelected) this.onNoFileSelected();
    };
    this.on('fileManager', 'noFileSelected', this.data.eventHandlers.onNoFileSelected);
    this.data.eventHandlers.onFileClosed = name => {
      this.onFileClosed(name);
    };
    this.on('fileManager', 'fileClosed', this.data.eventHandlers.onFileClosed);
    this.data.eventHandlers.onCompilationFinished = async function (success, data, source, input, version) {
      _this.compileErrors = data;
      if (success) {
        // forwarding the event to the appManager infra
        _this.emit('compilationFinished', source.target, source, 'soljson', data, input, version);
        if (data.errors && data.errors.length > 0) {
          _this.statusChanged({
            key: data.errors.length,
            title: `compilation finished successful with warning${data.errors.length > 1 ? 's' : ''}`,
            type: 'warning'
          });
        } else _this.statusChanged({
          key: 'succeed',
          title: 'compilation successful',
          type: 'success'
        });
      } else {
        const count = data.errors ? data.errors.filter(error => error.severity === 'error').length : 0 + (data.error ? 1 : 0);
        _this.statusChanged({
          key: count,
          title: `compilation failed with ${count} error${count > 1 ? 's' : ''}`,
          type: 'error'
        });
      }
      // Store the contracts and Update contract Selection
      if (success) {
        _this.compilationDetails = await _this.visitsContractApi(source, data);
      } else {
        _this.compilationDetails = {
          contractMap: {},
          contractsDetails: {},
          target: source ? source.target : null
        };
      }
      if (_this.onCompilationFinished) _this.onCompilationFinished(_this.compilationDetails);
      // set annotations
      if (data.errors) {
        for (const error of data.errors) {
          let pos = _remixSolidity.helper.getPositionDetails(error.formattedMessage);
          const file = pos.errFile;
          if (file) {
            pos = {
              row: pos.errLine,
              column: pos.errCol,
              text: error.formattedMessage,
              type: error.severity
            };
            await _this.call('editor', 'addAnnotation', pos, file);
          }
        }
      }
    };
    this.compiler.event.register('compilationFinished', this.data.eventHandlers.onCompilationFinished);
    this.data.eventHandlers.onThemeChanged = theme => {
      const invert = theme.quality === 'dark' ? 1 : 0;
      const img = document.getElementById('swarmLogo');
      if (img) {
        img.style.filter = `invert(${invert})`;
      }
    };
    this.on('themeModule', 'themeChanged', this.data.eventHandlers.onThemeChanged);

    // Run the compiler instead of trying to save the website
    this.data.eventHandlers.onKeyDown = async function (e) {
      // ctrl+s or command+s
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.keyCode === 83 && _this.currentFile !== '') {
        e.preventDefault();
        if (_this.currentFile && (_this.currentFile.endsWith('.sol') || _this.currentFile.endsWith('.yul'))) {
          if (await _this.getAppParameter('hardhat-compilation')) _this.compileTabLogic.runCompiler('hardhat');else if (await _this.getAppParameter('truffle-compilation')) _this.compileTabLogic.runCompiler('truffle');else _this.compileTabLogic.runCompiler(undefined);
        }
      }
    };
    window.document.addEventListener('keydown', this.data.eventHandlers.onKeyDown);
  }
  async visitsContractApi(source, data) {
    return new Promise(resolve => {
      if (!data.contracts || data.contracts && Object.keys(data.contracts).length === 0) {
        return resolve({
          contractMap: {},
          contractsDetails: {},
          target: source.target
        });
      }
      const contractMap = {};
      const contractsDetails = {};
      this.compiler.visitContracts(contract => {
        contractMap[contract.name] = contract;
        contractsDetails[contract.name] = (0, _solidityCompiler.parseContracts)(contract.name, contract.object, this.compiler.getSource(contract.file));
      });
      return resolve({
        contractMap,
        contractsDetails,
        target: source.target
      });
    });
  }
};
exports.CompilerApiMixin = CompilerApiMixin;

/***/ }),

/***/ "./app/compiler.ts":
/*!*************************!*\
  !*** ./app/compiler.ts ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CompilerClientApi = void 0;
var _plugin = __webpack_require__(/*! @remixproject/plugin */ "../../../node_modules/@remixproject/plugin/index.js");
var _pluginWebview = __webpack_require__(/*! @remixproject/plugin-webview */ "../../../node_modules/@remixproject/plugin-webview/index.js");
var _compilerApi = __webpack_require__(/*! ./compiler-api */ "./app/compiler-api.ts");
var _solidityCompiler = __webpack_require__(/*! @remix-ui/solidity-compiler */ "../../../libs/remix-ui/solidity-compiler/src/index.ts");
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

const defaultCompilerParameters = {
  runs: '200',
  optimize: false,
  version: 'soljson-v0.8.7+commit.e28d00a7',
  evmVersion: null,
  // compiler default
  language: 'Solidity',
  useFileConfiguration: false,
  configFilePath: "compiler_config.json"
};
class CompilerClientApi extends (0, _compilerApi.CompilerApiMixin)(_plugin.PluginClient) {
  constructor() {
    super();
    (0, _pluginWebview.createClient)(this);
    this.compileTabLogic = new _solidityCompiler.CompileTabLogic(this, this.contentImport);
    this.compiler = this.compileTabLogic.compiler;
    this.compileTabLogic.init();
    this.initCompilerApi();
  }
  getCompilerParameters() {
    const params = {
      runs: localStorage.getItem('runs') || defaultCompilerParameters.runs,
      optimize: localStorage.getItem('optimize') === 'true',
      version: localStorage.getItem('version') || defaultCompilerParameters.version,
      evmVersion: localStorage.getItem('evmVersion') || defaultCompilerParameters.evmVersion,
      // default
      language: localStorage.getItem('language') || defaultCompilerParameters.language,
      useFileConfiguration: localStorage.getItem('useFileConfiguration') === 'true',
      configFilePath: localStorage.getItem('configFilePath') || defaultCompilerParameters.configFilePath
    };
    return params;
  }
  setCompilerParameters(params) {
    for (const key of Object.keys(params)) {
      localStorage.setItem(key, params[key]);
    }
  }
  async getAppParameter(name) {
    return await _plugin.PluginClient.call('config', 'getAppParameter', name);
  }
  async setAppParameter(name, value) {
    await _plugin.PluginClient.call('config', 'setAppParameter', name, value);
  }
  getFileManagerMode() {
    return 'browser';
  }
}
exports.CompilerClientApi = CompilerClientApi;

/***/ }),

/***/ "./main.tsx":
/*!******************!*\
  !*** ./main.tsx ***!
  \******************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault */ "../../../node_modules/@nrwl/web/node_modules/@babel/runtime/helpers/interopRequireDefault.js");
var _react = _interopRequireDefault(__webpack_require__(/*! react */ "../../../node_modules/react/index.js"));
var _reactDom = _interopRequireDefault(__webpack_require__(/*! react-dom */ "../../../node_modules/react-dom/index.js"));
var _app = _interopRequireDefault(__webpack_require__(/*! ./app/app */ "./app/app.tsx"));
var _jsxDevRuntime = __webpack_require__(/*! react/jsx-dev-runtime */ "../../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/ovi/Desktop/micovi/remix-project/apps/solidity-compiler/src/main.tsx";
_reactDom.default.render( /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_react.default.StrictMode, {
  children: /*#__PURE__*/(0, _jsxDevRuntime.jsxDEV)(_app.default, {}, void 0, false, {
    fileName: _jsxFileName,
    lineNumber: 9,
    columnNumber: 5
  }, void 0)
}, void 0, false, {
  fileName: _jsxFileName,
  lineNumber: 8,
  columnNumber: 3
}, void 0), document.getElementById('root'));

/***/ }),

/***/ 0:
/*!************************!*\
  !*** multi ./main.tsx ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /Users/ovi/Desktop/micovi/remix-project/apps/solidity-compiler/src/main.tsx */"./main.tsx");


/***/ }),

/***/ 1:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 10:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 11:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 12:
/*!**************************************************!*\
  !*** ipfs-utils/src/files/glob-source (ignored) ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 13:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 14:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 15:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 16:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 17:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 18:
/*!****************************!*\
  !*** ./nextTick (ignored) ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 19:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 2:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 20:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 21:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 22:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 3:
/*!************************!*\
  !*** buffer (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 4:
/*!************************!*\
  !*** crypto (ignored) ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 5:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 6:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 7:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 8:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 9:
/*!**********************!*\
  !*** util (ignored) ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports) {

/* (ignored) */

/***/ })

},[[0,"runtime","vendor"]]]);
//# sourceMappingURL=main.js.map