'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerArtefacts = void 0;
const tslib_1 = require("tslib");
const engine_1 = require("@remixproject/engine");
const remix_lib_1 = require("@remix-project/remix-lib");
const remix_solidity_1 = require("@remix-project/remix-solidity");
const profile = {
    name: 'compilerArtefacts',
    methods: ['get', 'addResolvedContract', 'getCompilerAbstract', 'getAllContractDatas', 'getLastCompilationResult', 'getArtefactsByContractName', 'getContractDataFromAddress'],
    events: [],
    version: '0.0.1'
};
class CompilerArtefacts extends engine_1.Plugin {
    constructor() {
        super(profile);
        this.compilersArtefacts = {};
        this.compilersArtefactsPerFile = {};
    }
    clear() {
        this.compilersArtefacts = {};
        this.compilersArtefactsPerFile = {};
    }
    onActivation() {
        const saveCompilationPerFileResult = (file, source, languageVersion, data, input) => {
            this.compilersArtefactsPerFile[file] = new remix_solidity_1.CompilerAbstract(languageVersion, data, source, input);
        };
        this.on('solidity', 'compilationFinished', (file, source, languageVersion, data, input, version) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source, input);
            saveCompilationPerFileResult(file, source, languageVersion, data);
        });
        this.on('vyper', 'compilationFinished', (file, source, languageVersion, data) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source);
            saveCompilationPerFileResult(file, source, languageVersion, data);
        });
        this.on('lexon', 'compilationFinished', (file, source, languageVersion, data) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source);
            saveCompilationPerFileResult(file, source, languageVersion, data);
        });
        this.on('yulp', 'compilationFinished', (file, source, languageVersion, data) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source);
            saveCompilationPerFileResult(file, source, languageVersion, data);
        });
        this.on('solidityUnitTesting', 'compilationFinished', (file, source, languageVersion, data, input, version) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source, input);
            saveCompilationPerFileResult(file, source, languageVersion, data, input);
        });
        this.on('nahmii-compiler', 'compilationFinished', (file, source, languageVersion, data) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source);
            saveCompilationPerFileResult(file, source, languageVersion, data);
        });
        this.on('hardhat', 'compilationFinished', (file, source, languageVersion, data) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source);
            saveCompilationPerFileResult(file, source, languageVersion, data);
        });
        this.on('truffle', 'compilationFinished', (file, source, languageVersion, data) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source);
            saveCompilationPerFileResult(file, source, languageVersion, data);
        });
        this.on('foundry', 'compilationFinished', (file, source, languageVersion, data) => {
            this.compilersArtefacts.__last = new remix_solidity_1.CompilerAbstract(languageVersion, data, source);
            saveCompilationPerFileResult(file, source, languageVersion, data);
        });
    }
    /**
     * Get artefacts for last compiled contract
     * * @returns last compiled contract compiler abstract
     */
    getLastCompilationResult() {
        return this.compilersArtefacts.__last;
    }
    /**
     * Get compilation output for contracts compiled during a session of Remix IDE
     * @returns compilatin output
     */
    getAllContractDatas() {
        return this.filterAllContractDatas(() => true);
    }
    /**
     * filter compilation output for contracts compiled during a session of Remix IDE
     * @returns compilatin output
     */
    filterAllContractDatas(filter) {
        const contractsData = {};
        Object.keys(this.compilersArtefactsPerFile).map((targetFile) => {
            const contracts = this.compilersArtefactsPerFile[targetFile].getContracts();
            Object.keys(contracts).map((file) => {
                if (filter(file, contracts[file]))
                    contractsData[file] = contracts[file];
            });
        });
        // making sure we save last compilation result in there
        if (this.compilersArtefacts.__last) {
            const contracts = this.compilersArtefacts.__last.getContracts();
            Object.keys(contracts).map((file) => {
                if (filter(file, contracts[file]))
                    contractsData[file] = contracts[file];
            });
        }
        return contractsData;
    }
    /**
     * Get a particular contract output/artefacts from a compiler output of a Solidity file compilation
     * @param compilerOutput compiler output
     * @param contractName contract name
     * @returns arefacts object, with fully qualified name (e.g; contracts/1_Storage.sol:Storage) as key
     */
    _getAllContractArtefactsfromOutput(compilerOutput, contractName) {
        const contractArtefacts = {};
        for (const filename in compilerOutput) {
            if (Object.keys(compilerOutput[filename]).includes(contractName))
                contractArtefacts[filename + ':' + contractName] = compilerOutput[filename][contractName];
        }
        return contractArtefacts;
    }
    /**
     * Populate resultant object with a particular contract output/artefacts by processing all the artifacts stored in file explorer
     * @param path path to start looking from
     * @param contractName contract to be looked for
     * @param contractArtefacts populated resultant artefacts object, with fully qualified name (e.g: contracts/1_Storage.sol:Storage) as key
     * Once method execution completes, contractArtefacts object will hold all possible artefacts for contract
     */
    _populateAllContractArtefactsFromFE(path, contractName, contractArtefacts) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const dirList = yield this.call('fileManager', 'dirList', path);
            if (dirList && dirList.length) {
                for (const dirPath of dirList) {
                    // check if directory contains an 'artifacts' folder and a 'build-info' folder inside 'artifacts'
                    if (dirPath === path + '/artifacts' && (yield this.call('fileManager', 'exists', dirPath + '/build-info'))) {
                        const buildFileList = yield this.call('fileManager', 'fileList', dirPath + '/build-info');
                        // process each build-info file to populate the artefacts for contractName
                        for (const buildFile of buildFileList) {
                            let content = yield this.call('fileManager', 'readFile', buildFile);
                            if (content)
                                content = JSON.parse(content);
                            const compilerOutput = content.output.contracts;
                            const artefacts = this._getAllContractArtefactsfromOutput(compilerOutput, contractName);
                            // populate the resultant object with artefacts
                            Object.assign(contractArtefacts, artefacts);
                        }
                    }
                    else
                        yield this._populateAllContractArtefactsFromFE(dirPath, contractName, contractArtefacts);
                }
            }
            else
                return;
        });
    }
    /**
     * Get artefacts for a contract (called by script-runner)
     * @param name contract name or fully qualified name i.e. <filename>:<contractname> e.g: contracts/1_Storage.sol:Storage
     * @returns artefacts for the contract
     */
    getArtefactsByContractName(name) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const contractsDataByFilename = this.getAllContractDatas();
            // check if name is a fully qualified name
            if (name.includes(':')) {
                const fullyQualifiedName = name;
                const nameArr = fullyQualifiedName.split(':');
                const filename = nameArr[0];
                const contract = nameArr[1];
                if (Object.keys(contractsDataByFilename).includes(filename) && contractsDataByFilename[filename][contract])
                    return contractsDataByFilename[filename][contract];
                else {
                    const allContractsData = {};
                    yield this._populateAllContractArtefactsFromFE('contracts', contract, allContractsData);
                    if (allContractsData[fullyQualifiedName])
                        return { fullyQualifiedName, artefact: allContractsData[fullyQualifiedName] };
                    else
                        throw new Error(`Could not find artifacts for ${fullyQualifiedName}. Compile contract to generate artifacts.`);
                }
            }
            else {
                const contractName = name;
                const contractArtefacts = this._getAllContractArtefactsfromOutput(contractsDataByFilename, contractName);
                let keys = Object.keys(contractArtefacts);
                if (!keys.length) {
                    yield this._populateAllContractArtefactsFromFE('contracts', contractName, contractArtefacts);
                    keys = Object.keys(contractArtefacts);
                }
                if (keys.length === 1)
                    return { fullyQualifiedName: keys[0], artefact: contractArtefacts[keys[0]] };
                else if (keys.length > 1) {
                    throw new Error(`There are multiple artifacts for contract "${contractName}", please use a fully qualified name.\n
          Please replace ${contractName} for one of these options wherever you are trying to read its artifact: \n
          ${keys.join()}\n
          OR just compile the required contract again`);
                }
                else
                    throw new Error(`Could not find artifacts for ${contractName}. Compile contract to generate artifacts.`);
            }
        });
    }
    getCompilerAbstract(file) {
        return this.compilersArtefactsPerFile[file];
    }
    // compilerData is a CompilerAbstract object
    addResolvedContract(address, compilerData) {
        this.compilersArtefacts[address] = compilerData;
    }
    isResolved(address) {
        return this.compilersArtefacts[address] !== undefined;
    }
    get(key) {
        return this.compilersArtefacts[key];
    }
    getContractDataFromAddress(address) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            const code = yield this.call('blockchain', 'getCode', address);
            let found;
            this.filterAllContractDatas((file, contractsData) => {
                for (const name of Object.keys(contractsData)) {
                    const contract = contractsData[name];
                    if (remix_lib_1.util.compareByteCode(code, '0x' + contract.evm.deployedBytecode.object)) {
                        found = { name, contract };
                        return true;
                    }
                }
                return true;
            });
            return found;
        });
    }
}
exports.CompilerArtefacts = CompilerArtefacts;
//# sourceMappingURL=compiler-artefacts.js.map