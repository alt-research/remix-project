'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.compilerInputForConfigFile = exports.getValidLanguage = exports.Languages = void 0;
exports.default = (sources, opts) => {
    const o = {
        language: 'Solidity',
        sources: sources,
        settings: {
            optimizer: {
                enabled: opts.optimize === true || opts.optimize === 1,
                runs: opts.runs || 200
            },
            libraries: opts.libraries,
            outputSelection: {
                '*': {
                    '': ['ast'],
                    '*': ['abi', 'metadata', 'devdoc', 'userdoc', 'storageLayout', 'evm.legacyAssembly', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers', 'evm.gasEstimates', 'evm.assembly']
                }
            }
        }
    };
    if (opts.evmVersion) {
        if (opts.evmVersion.toLowerCase() == 'default') {
            opts.evmVersion = null;
        }
        else {
            o.settings.evmVersion = opts.evmVersion;
        }
    }
    if (opts.language) {
        o.language = opts.language;
    }
    if (opts.language === 'Yul' && o.settings.optimizer.enabled) {
        if (!o.settings.optimizer.details) {
            o.settings.optimizer.details = {};
        }
        o.settings.optimizer.details.yul = true;
    }
    return JSON.stringify(o);
};
exports.Languages = ['Solidity', 'Yul'];
function getValidLanguage(val) {
    if (val !== undefined && val !== null && val) {
        const lang = val.slice(0, 1).toUpperCase() + val.slice(1).toLowerCase();
        return exports.Languages.indexOf(lang) > -1 ? lang : null;
    }
    return null;
}
exports.getValidLanguage = getValidLanguage;
function compilerInputForConfigFile(sources, opts) {
    opts.sources = sources;
    return JSON.stringify(opts);
}
exports.compilerInputForConfigFile = compilerInputForConfigFile;
//# sourceMappingURL=compiler-input.js.map