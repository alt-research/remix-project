(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["raw-loader!-ethersproject-json-wallets-lib-index-d-ts"],{

/***/ "../../../node_modules/raw-loader/dist/cjs.js!../../../node_modules/@ethersproject/json-wallets/lib/index.d.ts":
/*!***********************************************************************************************************************************************************************************!*\
  !*** /Users/ovi/Desktop/micovi/remix-project/node_modules/raw-loader/dist/cjs.js!/Users/ovi/Desktop/micovi/remix-project/node_modules/@ethersproject/json-wallets/lib/index.d.ts ***!
  \***********************************************************************************************************************************************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ("import { Bytes } from \"@ethersproject/bytes\";\nimport { ExternallyOwnedAccount } from \"@ethersproject/abstract-signer\";\nimport { decrypt as decryptCrowdsale } from \"./crowdsale\";\nimport { getJsonWalletAddress, isCrowdsaleWallet, isKeystoreWallet } from \"./inspect\";\nimport { decrypt as decryptKeystore, decryptSync as decryptKeystoreSync, encrypt as encryptKeystore, EncryptOptions, ProgressCallback } from \"./keystore\";\ndeclare function decryptJsonWallet(json: string, password: Bytes | string, progressCallback?: ProgressCallback): Promise<ExternallyOwnedAccount>;\ndeclare function decryptJsonWalletSync(json: string, password: Bytes | string): ExternallyOwnedAccount;\nexport { decryptCrowdsale, decryptKeystore, decryptKeystoreSync, encryptKeystore, isCrowdsaleWallet, isKeystoreWallet, getJsonWalletAddress, decryptJsonWallet, decryptJsonWalletSync, ProgressCallback, EncryptOptions, };\n//# sourceMappingURL=index.d.ts.map");

/***/ })

}]);
//# sourceMappingURL=raw-loader!-ethersproject-json-wallets-lib-index-d-ts.0.29.0-dev.1668678642399.js.map