"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const wizard_1 = require("@openzeppelin/wizard");
exports.default = (opts) => (0, tslib_1.__awaiter)(void 0, void 0, void 0, function* () {
    if (opts) {
        wizard_1.erc1155.defaults.mintable = opts.mintable;
        wizard_1.erc1155.defaults.burnable = opts.burnable;
        wizard_1.erc1155.defaults.pausable = opts.pausable;
    }
    const filesObj = {
        'contracts/MyToken.sol': wizard_1.erc1155.print(Object.assign(Object.assign({}, wizard_1.erc1155.defaults), { upgradeable: opts && opts.upgradeable ? opts.upgradeable : false })),
        // @ts-ignore
        'scripts/deploy_with_ethers.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/deploy_with_ethers.ts'))).default,
        // @ts-ignore
        'scripts/deploy_with_web3.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/deploy_with_web3.ts'))).default,
        // @ts-ignore
        'scripts/ethers-lib.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/ethers-lib.ts'))).default,
        // @ts-ignore
        'scripts/web3-lib.ts': (yield Promise.resolve().then(() => require('!!raw-loader!./scripts/web3-lib.ts'))).default
    };
    // If no options is selected, opts.upgradeable will be undefined
    // We do not show test file for upgradeable contract
    // @ts-ignore
    if (!opts || opts.upgradeable === undefined || !opts.upgradeable)
        filesObj['tests/MyToken_test.sol'] = (yield Promise.resolve().then(() => require('raw-loader!./tests/MyToken_test.sol'))).default;
    return filesObj;
});
//# sourceMappingURL=index.js.map