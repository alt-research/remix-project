import { ValueType } from './ValueType';
export declare class FunctionType extends ValueType {
    constructor(type: any, stateDefinitions: any, contractName: any, location: any);
    decodeValue(value: any): string;
}
