import {assert, expect, should} from 'chai';

import {ObjectManager} from "../src/object_manager";

describe('ObjectManager', function() {
    describe('#updateObject()', function() {
        it('should create a object for each new key', function() {
            // Mock callbacks
            const ledger = [];
            const create = (spec) => ({spec: spec});
            const update = (obj, spec) => { obj.oldspec = obj.spec; obj.spec = spec; };
            const deleted = (obj) => { ledger.push(obj); };

            // The object under test
            const manager = new ObjectManager(create, update, deleted);
            // Check some internal state
            expect(manager.objectCount.size).eq(0);
            
            // Add single object
            const key0 = "key0";
            const spec0 = new Float32Array([3]);
            const obj0 = manager.update(key0, spec0);
            expect(obj0.spec).eq(spec0);
            expect(manager.objectCount.size).eq(1);
            expect(manager.objectCount.get(obj0)).eq(1);
            
            // Add another object under different key
            const key1 = "key1";
            const spec1 = new Float32Array([5]);
            const obj1 = manager.update(key1, spec1);
            expect(obj1.spec).eq(spec1);
            expect(manager.objectCount.size).eq(2);
            expect(manager.objectCount.get(obj1)).eq(1);

            expect(manager.objectCount.get(obj0)).eq(1);
            
            // Passing a new spec for existing function triggers update
            const spec0b = new Float32Array([7]);
            const obj0b = manager.update(key0, spec0b, obj0);
            expect(obj0b.spec).eq(spec0b);
            expect(obj0b.oldspec).eq(spec0);
            expect(obj0b).eq(obj0);
            expect(manager.objectCount.get(obj0)).eq(1);
            
            // Passing prev object matching key doesn't do anything
            // const spec1b = new Float32Array([9]);
            // const obj1b = manager.update(key1, spec1b, obj1);
            // expect(obj1b.spec).to.equal(spec1b);
            // expect(obj1b.oldspec).to.equal(spec1);
            // expect(obj1b).to.equal(obj1);

            // Try decrementing object counters and check that delete callback is triggered
            expect(ledger.length).eq(0);

            const count0 = manager.decrement(obj0);
            expect(count0).eq(0);
            expect(ledger.length).eq(1);
            expect(ledger[0]).eq(obj0);
            expect(manager.objectCount.get(obj1)).eq(1);

            const count1 = manager.decrement(obj1);
            expect(count1).eq(0);
            expect(manager.objectCount.get(obj1)).eq(undefined);
            expect(ledger.length).eq(2);
            expect(ledger[0]).eq(obj0);
            expect(ledger[1]).eq(obj1);
        });
    });
});
