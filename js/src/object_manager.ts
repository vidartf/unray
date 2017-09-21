"use strict";

export
class ObjectManager {
    constructor(create, update, deleted) {
        this.createCb = create;
        this.updateCb = update;
        this.deletedCb = deleted;
    }

    increment(object): void {
        this.objectCount.set(object, (this.objectCount.get(object) | 0) + 1);
    }

    decrement(object): number {
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

    update(key: string, spec, previousObject?: any): void {
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

    createCb: (spec: any) => any;
    updateCb: (object: any, spec: any) => void;
    deletedCb: (spec: any) => void;

    object2key = new Map<any, string>();
    key2object = new Map<string, any>();
    objectCount = new Map<any, number>();
};
