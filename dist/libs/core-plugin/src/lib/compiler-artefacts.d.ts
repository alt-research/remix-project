import { Plugin } from '@remixproject/engine';
export declare class CompilerArtefacts extends Plugin {
    compilersArtefactsPerFile: any;
    compilersArtefacts: any;
    constructor();
    clear(): void;
    onActivation(): void;
    /**
     * Get artefacts for last compiled contract
     * * @returns last compiled contract compiler abstract
     */
    getLastCompilationResult(): any;
    /**
     * Get compilation output for contracts compiled during a session of Remix IDE
     * @returns compilatin output
     */
    getAllContractDatas(): {};
    /**
     * filter compilation output for contracts compiled during a session of Remix IDE
     * @returns compilatin output
     */
    filterAllContractDatas(filter: any): {};
    /**
     * Get a particular contract output/artefacts from a compiler output of a Solidity file compilation
     * @param compilerOutput compiler output
     * @param contractName contract name
     * @returns arefacts object, with fully qualified name (e.g; contracts/1_Storage.sol:Storage) as key
     */
    _getAllContractArtefactsfromOutput(compilerOutput: any, contractName: any): {};
    /**
     * Populate resultant object with a particular contract output/artefacts by processing all the artifacts stored in file explorer
     * @param path path to start looking from
     * @param contractName contract to be looked for
     * @param contractArtefacts populated resultant artefacts object, with fully qualified name (e.g: contracts/1_Storage.sol:Storage) as key
     * Once method execution completes, contractArtefacts object will hold all possible artefacts for contract
     */
    _populateAllContractArtefactsFromFE(path: any, contractName: any, contractArtefacts: any): Promise<void>;
    /**
     * Get artefacts for a contract (called by script-runner)
     * @param name contract name or fully qualified name i.e. <filename>:<contractname> e.g: contracts/1_Storage.sol:Storage
     * @returns artefacts for the contract
     */
    getArtefactsByContractName(name: any): Promise<any>;
    getCompilerAbstract(file: any): any;
    addResolvedContract(address: any, compilerData: any): void;
    isResolved(address: any): boolean;
    get(key: any): any;
    getContractDataFromAddress(address: any): Promise<any>;
}
