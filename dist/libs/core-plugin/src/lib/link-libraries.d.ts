import { Plugin } from '@remixproject/engine';
import { ContractData } from '../types/contract';
export declare class DeployLibraries extends Plugin {
    blockchain: any;
    constructor(blockchain: any);
    isConcerned(contractData: ContractData): Promise<boolean>;
    execute(contractData: ContractData, contractMetadata: any, compiledContracts: any): Promise<unknown>;
}
export declare class LinkLibraries extends Plugin {
    blockchain: any;
    constructor(blockchain: any);
    isConcerned(contractData: ContractData): Promise<boolean>;
    execute(contractData: ContractData, contractMetadata: any, compiledContracts: any): Promise<unknown>;
}
