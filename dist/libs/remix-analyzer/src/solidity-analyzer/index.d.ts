import { CompilationResult, AnalyzerModule, AnalysisReport } from '../types';
declare type ModuleObj = {
    name: string;
    mod: AnalyzerModule;
};
export default class staticAnalysisRunner {
    /**
     * Run analysis (Used by IDE)
     * @param compilationResult contract compilation result
     * @param toRun module indexes (compiled from remix IDE)
     * @param callback callback
     */
    run(compilationResult: CompilationResult, toRun: number[]): AnalysisReport[];
    /**
     * Run analysis passing list of modules to run
     * @param compilationResult contract compilation result
     * @param modules analysis module
     * @param callback callback
     */
    runWithModuleList(compilationResult: CompilationResult, modules: ModuleObj[]): AnalysisReport[];
    /**
     * Get list of all analysis modules
     */
    modules(): any[];
}
export {};
