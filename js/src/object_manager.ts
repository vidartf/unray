"use strict";

export
class ObjectManager<T, U> {
    constructor(create: (spec: T) => U, update: (object: U, spec: T) => void, deleted?: (object: U) => void) {
        this.createCb = create;
        this.updateCb = update;
        this.deletedCb = deleted;
    }

    increment(object: U): void {
        this.objectCount.set(object, (this.objectCount.get(object) || 0) + 1);
    }

    decrement(object: U): number {
        const count = (this.objectCount.get(object) || 0) - 1;
        if (count === 0) {
            const key = this.object2key.get(object)!;

            this.object2key.delete(object);
            this.key2object.delete(key);
            this.objectCount.delete(object);

            if (this.deletedCb) {
                this.deletedCb(object);
            }
        } else {
            this.objectCount.set(object, count);
        }
        return count;
    }

    update(key: string, spec: T, previousObject?: U): U {
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

    createCb: (spec: T) => U;
    updateCb: (object: U, spec: T) => void;
    deletedCb?: (object: U) => void;

    object2key = new Map<U, string>();
    key2object = new Map<string, U>();
    objectCount = new Map<U, number>();
};
