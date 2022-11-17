import { Plugin } from '@remixproject/engine';
declare type GistCallBackFn = (gistId: string) => void;
export declare class GistHandler extends Plugin {
    constructor();
    handleLoad(gistId: string | null, cb: GistCallBackFn): Promise<boolean>;
    load(gistId: string | null): Promise<boolean>;
}
export {};
