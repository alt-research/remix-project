export declare const fetchContractFromEtherscan: (plugin: any, network: any, contractAddress: any, targetPath: any, shouldSetFile?: boolean, key?: any) => Promise<{
    settings: {
        version: any;
        language: string;
        evmVersion: any;
        optimize: boolean;
        runs: number;
    };
    compilationTargets: {};
}>;
