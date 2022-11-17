"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
exports.default = () => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
    return {
        // @ts-ignore
        'contracts/1_Storage.sol': (yield Promise.resolve().then(() => require('raw-loader!./contracts/1_Storage.sol'))).default,
        // @ts-ignore
        'contracts/2_Owner.sol': (yield Promise.resolve().then(() => require('raw-loader!./contracts/2_Owner.sol'))).default,
        // @ts-ignore
        'contracts/3_Ballot.sol': (yield Promise.resolve().then(() => require('raw-loader!./contracts/3_Ballot.sol'))).default,
        // @ts-ignore
        'scripts/deploy_with_ethers.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/deploy_with_ethers.ts'))).default,
        // @ts-ignore
        'scripts/deploy_with_web3.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/deploy_with_web3.ts'))).default,
        // @ts-ignore
        'scripts/ethers-lib.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/ethers-lib.ts'))).default,
        // @ts-ignore
        'scripts/web3-lib.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/web3-lib.ts'))).default,
        // @ts-ignore
        'tests/Ballot_test.sol': (yield Promise.resolve().then(() => require('raw-loader!./tests/Ballot_test.sol'))).default,
        // @ts-ignore
        'tests/storage.test.js': (yield Promise.resolve().then(() => require('!!raw-loader!./tests/storage.test.js'))).default,
        // @ts-ignore
        'README.txt': (yield Promise.resolve().then(() => require('raw-loader!./README.txt'))).default,
    };
});
//# sourceMappingURL=index.js.map