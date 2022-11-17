import { Plugin } from '@remixproject/engine';
import { ContractAST, ContractSources, DeployOptions } from '../types/contract';
export declare class OpenZeppelinProxy extends Plugin {
    blockchain: any;
    kind: 'UUPS' | 'Transparent';
    constructor(blockchain: any);
    isConcerned(ast?: ContractAST): Promise<boolean>;
    getProxyOptions(data: ContractSources, file: string): Promise<{
        [name: string]: DeployOptions;
    }>;
    getUUPSContractOptions(contracts: any, ast: any, file: any): Promise<{}>;
    executeUUPSProxy(implAddress: string, args: string | string[], initializeABI: any, implementationContractObject: any): Promise<void>;
    executeUUPSContractUpgrade(proxyAddress: string, newImplAddress: string, newImplementationContractObject: any): Promise<void>;
    deployUUPSProxy(implAddress: string, _data: string, implementationContractObject: any): Promise<void>;
    upgradeUUPSProxy(proxyAddress: string, newImplAddress: string, newImplementationContractObject: any): Promise<void>;
}
