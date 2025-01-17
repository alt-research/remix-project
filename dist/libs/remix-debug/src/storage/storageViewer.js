'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageViewer = void 0;
const tslib_1 = require("tslib");
const remix_lib_1 = require("@remix-project/remix-lib");
const mappingPreimages_1 = require("./mappingPreimages");
/**
   * easier access to the storage resolver
   * Basically one instance is created foreach execution step and foreach component that need it.
   * (TODO: one instance need to be shared over all the components)
   */
class StorageViewer {
    constructor(_context, _storageResolver, _traceManager) {
        this.context = _context;
        this.storageResolver = _storageResolver;
        this.web3 = this.storageResolver.web3;
        this.initialMappingsLocationPromise = null;
        this.currentMappingsLocationPromise = null;
        this.storageChanges = _traceManager.accumulateStorageChanges(this.context.stepIndex, this.context.address, {});
    }
    /**
      * return the storage for the current context (address and vm trace index)
      * by default now returns the range 0 => 1000
      *
      * @param {Function} - callback - contains a map: [hashedKey] = {key, hashedKey, value}
      */
    storageRange() {
        return new Promise((resolve, reject) => {
            this.storageResolver.storageRange(this.context.tx, this.context.stepIndex, this.context.address).then((storage) => {
                resolve(Object.assign({}, storage, this.storageChanges));
            }).catch(reject);
        });
    }
    /**
      * return a slot value for the current context (address and vm trace index)
      * @param {String} - slot - slot key (not hashed key!)
      * @param {Function} - callback - {key, hashedKey, value} -
      */
    storageSlot(slot, callback) {
        const hashed = remix_lib_1.util.sha3_256(slot);
        if (this.storageChanges[hashed]) {
            return callback(null, this.storageChanges[hashed]);
        }
        this.storageResolver.storageSlot(hashed, this.context.tx, this.context.stepIndex, this.context.address).then((storage) => {
            callback(null, storage);
        }).catch(callback);
    }
    /**
      * return True if the storage at @arg address is complete
      *
      * @param {String} address  - contract address
      * @return {Bool} - return True if the storage at @arg address is complete
      */
    isComplete(address) {
        return this.storageResolver.isComplete(address);
    }
    /**
      * return all the possible mappings locations for the current context (cached) do not return state changes during the current transaction
      *
      * @param {Array} corrections - used in case the calculated sha3 has been modifyed before SSTORE (notably used for struct in mapping).
      */
    initialMappingsLocation(corrections) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!this.initialMappingsLocationPromise) {
                this.initialMappingsLocationPromise = this.storageResolver.initialPreimagesMappings(this.context.tx, this.context.stepIndex, this.context.address, corrections);
            }
            return this.initialMappingsLocationPromise;
        });
    }
    /**
      * return all the possible mappings locations for the current context (cached) and current mapping slot. returns state changes during the current transaction
      *
      * @param {Array} corrections - used in case the calculated sha3 has been modifyed before SSTORE (notably used for struct in mapping).
      */
    mappingsLocation(corrections) {
        return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
            if (!this.currentMappingsLocationPromise) {
                this.currentMappingsLocationPromise = new Promise((resolve, reject) => {
                    const mappingsLocationChanges = this.extractMappingsLocationChanges(this.storageChanges, corrections);
                    return resolve(mappingsLocationChanges);
                });
            }
            return this.currentMappingsLocationPromise;
        });
    }
    /**
      * retrieve mapping location changes from the storage changes.
      * @param {Map} storageChanges
      * @param {Array} corrections - used in case the calculated sha3 has been modifyed before SSTORE (notably used for struct in mapping).
      */
    extractMappingsLocationChanges(storageChanges, corrections) {
        if (this.mappingsLocationChanges) {
            return this.mappingsLocationChanges;
        }
        const mappings = (0, mappingPreimages_1.decodeMappingsKeys)(this.web3, storageChanges, corrections);
        this.mappingsLocationChanges = mappings;
        return this.mappingsLocationChanges;
    }
}
exports.StorageViewer = StorageViewer;
//# sourceMappingURL=storageViewer.js.map