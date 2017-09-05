"use strict";

export
class ObjectManager {
    constructor(create, update, deleted) {
        this.createCb = create;
        this.updateCb = update;
        this.deletedCb = deleted;

        this.object2key = new Map();
        this.key2object = new Map();
        this.objectCount = new Map();
    }

    increment(object) {
        this.objectCount.set(object, (this.objectCount.get(object) | 0) + 1);
    }

    decrement(object) {
        const count = (this.objectCount.get(object) | 0) - 1;
        if (count === 0) {
            const key = this.object2key[object];

            this.object2key.delete(object);
            this.key2object.delete(key);
            this.objectCount.delete(object);

            this.deletedCb(object);
        } else {
            this.objectCount.set(object, count);
        }
        return count;
    }

    update(key, spec, previousObject) {
        let object = this.key2object.get(key);
        if (object) {
            // Update object in place if it's in the cache
            this.updateCb(object, spec);
        } else {
            // Create object if it's not in the cache
            object = this.createCb(spec);

            // Initialize internal state for key/object pair
            this.object2key.set(object, key);
            this.key2object.set(key, object);
            this.objectCount.set(object, 0);
        }
        // Count new users of object
        if (object !== previousObject) {
            this.increment(object);
        //     if (previousObject) {
        //         this.decrement(previousObject);
        //     }
        }
        return object;
    }
};
