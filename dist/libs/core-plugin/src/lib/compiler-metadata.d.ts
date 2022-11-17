import { Plugin } from '@remixproject/engine';
export declare class CompilerMetadata extends Plugin {
    networks: string[];
    innerPath: string;
    buildInfoNames: Record<string, string>;
    constructor();
    _JSONFileName(path: any, contractName: any): any;
    _MetadataFileName(path: any, contractName: any): any;
    onActivation(): void;
    removeStoredBuildInfo(currentInput: any, path: any, filePath: any): Promise<void>;
    setBuildInfo(version: any, input: any, output: any, path: any, filePath: any): Promise<void>;
    _extractPathOf(file: any): string;
    _setArtefacts(content: any, contract: any, path: any): Promise<void>;
    _syncContext(contract: any, metadata: any): any;
    deployMetadataOf(contractName: any, fileLocation: any): Promise<any>;
    joinPath(...paths: any[]): any;
}
