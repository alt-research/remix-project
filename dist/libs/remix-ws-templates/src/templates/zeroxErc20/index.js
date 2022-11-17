"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
exports.default = () => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
    return {
        // @ts-ignore
        'contracts/SampleERC20.sol': (yield Promise.resolve().then(() => require('raw-loader!./contracts/SampleERC20.sol'))).default,
        // @ts-ignore
        'scripts/deploy_with_ethers.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/deploy_with_ethers.ts'))).default,
        // @ts-ignore
        'scripts/deploy_with_web3.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/deploy_with_web3.ts'))).default,
        // @ts-ignore
        'scripts/ethers-lib.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/ethers-lib.ts'))).default,
        // @ts-ignore
        'scripts/web3-lib.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/web3-lib.ts'))).default,
        // @ts-ignore
        'tests/SampleERC20_test.sol': (yield Promise.resolve().then(() => require('raw-loader!./tests/SampleERC20_test.sol'))).default
    };
});
//# sourceMappingURL=index.js.map