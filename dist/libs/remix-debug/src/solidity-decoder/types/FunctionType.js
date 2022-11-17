'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionType = void 0;
const ValueType_1 = require("./ValueType");
class FunctionType extends ValueType_1.ValueType {
    constructor(type, stateDefinitions, contractName, location) {
        super(1, 8, 'function');
    }
    decodeValue(value) {
        return 'at program counter ' + value;
    }
}
exports.FunctionType = FunctionType;
//# sourceMappingURL=FunctionType.js.map