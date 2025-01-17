'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArrayOrStringStart = exports.parseFunctionParams = exports.decodeResponse = exports.linkLibrary = exports.setLibraryAddress = exports.linkLibraryStandard = exports.linkLibraryStandardFromlinkReferences = exports.deployLibrary = exports.linkBytecode = exports.linkBytecodeLegacy = exports.linkBytecodeStandard = exports.atAddress = exports.buildData = exports.encodeConstructorCallAndDeployLibraries = exports.linkLibraries = exports.encodeConstructorCallAndLinkLibraries = exports.encodeFunctionCall = exports.encodeParams = exports.encodeData = void 0;
const ethers_1 = require("ethers");
const txHelper_1 = require("./txHelper");
const async_1 = require("async");
const linker_1 = require("solc/linker");
const ethereumjs_util_1 = require("ethereumjs-util");
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
    }
    catch (e) {
        return { error: 'cannot encode arguments' };
    }
    if (contractbyteCode) {
        return { data: '0x' + contractbyteCode + encodedHex.replace('0x', '') };
    }
    else {
        return { data: (0, txHelper_1.encodeFunctionId)(funABI) + encodedHex.replace('0x', '') };
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
            }
            catch (e) {
                return callback('Error encoding arguments: ' + e);
            }
        }
        if (data.slice(0, 9) === 'undefined') {
            dataHex = data.slice(9);
        }
        if (data.slice(0, 2) === '0x') {
            dataHex = data.slice(2);
        }
    }
    else if (params.indexOf('raw:0x') === 0) {
        // in that case we consider that the input is already encoded and *does not* contain the method signature
        dataHex = params.replace('raw:0x', '');
        data = Buffer.from(dataHex, 'hex');
    }
    else {
        try {
            funArgs = parseFunctionParams(params);
        }
        catch (e) {
            return callback('Error encoding arguments: ' + e);
        }
        try {
            if (funArgs.length > 0) {
                data = (0, txHelper_1.encodeParams)(funAbi, funArgs);
                dataHex = data.toString();
            }
        }
        catch (e) {
            return callback('Error encoding arguments: ' + e);
        }
        if (data.slice(0, 9) === 'undefined') {
            dataHex = data.slice(9);
        }
        if (data.slice(0, 2) === '0x') {
            dataHex = data.slice(2);
        }
    }
    callback(null, { data: data, dataHex: dataHex, funArgs: funArgs });
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
        if (error)
            return callback(error);
        callback(null, { dataHex: (0, txHelper_1.encodeFunctionId)(funAbi) + encodedParam.dataHex, funAbi, funArgs: encodedParam.funArgs });
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
        if (error)
            return callback(error);
        linkLibraries(contract, linkLibrariesAddresses, linkReferences, (error, bytecodeToDeploy) => {
            callback(error, { dataHex: bytecodeToDeploy + encodedParam.dataHex, funAbi, funArgs: encodedParam.funArgs, contractBytecode: contract.evm.bytecode.object });
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
                    if (!(0, ethereumjs_util_1.isValidAddress)(address))
                        return callback(address + ' is not a valid address. Please check the provided address is valid.');
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
        if (error)
            return callback(error);
        let dataHex = '';
        const contractBytecode = contract.evm.bytecode.object;
        let bytecodeToDeploy = contract.evm.bytecode.object;
        if (bytecodeToDeploy.indexOf('_') >= 0) {
            linkBytecode(contract, contracts, (err, bytecode) => {
                if (err) {
                    callback('Error deploying required libraries: ' + err);
                }
                else {
                    bytecodeToDeploy = bytecode + dataHex;
                    return callback(null, { dataHex: bytecodeToDeploy, funAbi, funArgs: encodedParam.funArgs, contractBytecode, contractName: contractName });
                }
            }, callbackStep, callbackDeployLibrary);
            return;
        }
        else {
            dataHex = bytecodeToDeploy + encodedParam.dataHex;
        }
        callback(null, { dataHex: bytecodeToDeploy, funAbi, funArgs: encodedParam.funArgs, contractBytecode, contractName: contractName });
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
    }
    else {
        try {
            if (params.length > 0) {
                funArgs = parseFunctionParams(params);
            }
        }
        catch (e) {
            return callback('Error encoding arguments: ' + e);
        }
        try {
            data = (0, txHelper_1.encodeParams)(funAbi, funArgs);
            dataHex = data.toString();
        }
        catch (e) {
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
                }
                else {
                    bytecodeToDeploy = bytecode + dataHex;
                    return callback(null, { dataHex: bytecodeToDeploy, funAbi, funArgs, contractBytecode, contractName: contractName });
                }
            }, callbackStep, callbackDeployLibrary);
            return;
        }
        else {
            dataHex = bytecodeToDeploy + dataHex;
        }
    }
    else {
        dataHex = (0, txHelper_1.encodeFunctionId)(funAbi) + dataHex;
    }
    callback(null, { dataHex, funAbi, funArgs, contractBytecode, contractName: contractName });
}
exports.buildData = buildData;
function atAddress() { }
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
            }
            else {
                //@ts-ignore
                cbLibDeployed('Cannot find compilation data of library ' + libName);
            }
        }, (error) => {
            cbFile(error);
        });
    }, (error) => {
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
    }
    else {
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
            if (err)
                callback(err);
            else {
                library.evm.bytecode.object = bytecode;
                deployLibrary(libraryName, libraryShortName, library, contracts, callback, callbackStep, callbackDeployLibrary);
            }
        }, callbackStep, callbackDeployLibrary);
    }
    else {
        callbackStep(`creation of library ${libraryName} pending...`);
        const data = { dataHex: bytecode, funAbi: { type: 'constructor' }, funArgs: [], contractBytecode: bytecode, contractName: libraryShortName, contractABI: library.abi };
        callbackDeployLibrary({ data: data, useCall: false }, (err, txResult) => {
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
    return (0, linker_1.linkBytecode)(bytecodeToLink, { [libraryName]: (0, ethereumjs_util_1.addHexPrefix)(address) });
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
            if (!response || !response.length)
                response = new Uint8Array(32 * fnabi.outputs.length); // ensuring the data is at least filled by 0 cause `AbiCoder` throws if there's not engouh data
            // decode data
            const abiCoder = new ethers_1.ethers.utils.AbiCoder();
            const decodedObj = abiCoder.decode(outputTypes, response);
            const json = {};
            for (i = 0; i < outputTypes.length; i++) {
                const name = fnabi.outputs[i].name;
                json[i] = outputTypes[i] + ': ' + (name ? name + ' ' + decodedObj[i] : decodedObj[i]);
            }
            return json;
        }
        catch (e) {
            return { error: 'Failed to decode output: ' + e };
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
        }
        else if (params.charAt(i) === '[') { // If an array/struct opening bracket is received
            startIndex = -1;
            let bracketCount = 1;
            let j;
            for (j = i + 1; bracketCount !== 0; j++) {
                // Increase count if another array opening bracket is received (To handle nested array)
                if (params.charAt(j) === '[') {
                    bracketCount++;
                }
                else if (params.charAt(j) === ']') { // // Decrease count if an array closing bracket is received (To handle nested array)
                    bracketCount--;
                }
                // Throw error if end of params string is arrived but couldn't get end of tuple
                if (bracketCount !== 0 && j === params.length - 1) {
                    throw new Error('invalid tuple params');
                }
                if (bracketCount === 0)
                    break;
            }
            args.push(parseFunctionParams(params.substring(i + 1, j)));
            i = j - 1;
        }
        else if (params.charAt(i) === ',' || i === params.length - 1) { // , or end of string
            // if startIndex >= 0, it means a parameter was being parsed, it can be first or other parameter
            if (startIndex >= 0) {
                let param = params.substring(startIndex, i === params.length - 1 ? undefined : i);
                const trimmed = param.trim();
                if (param.startsWith('0x'))
                    param = `${param}`;
                if (/[0-9]/g.test(trimmed))
                    param = `${trimmed}`;
                if (typeof param === 'string') {
                    if (trimmed === 'true')
                        param = true;
                    if (trimmed === 'false')
                        param = false;
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
//# sourceMappingURL=txFormat.js.map