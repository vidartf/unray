"use strict";

import expect = require('expect.js');

import {ObjectManager} from "../src/object_manager";

interface TestObj {spec: Float32Array, oldspec?: Float32Array}

describe('ObjectManager', function() {
    describe('#updateObject()', function() {
        it('should create a object for each new key', function() {
            // Mock callbacks
            const ledger: TestObj[] = [];
            const create = (spec: Float32Array) => ({spec: spec});
            const update = (obj: TestObj, spec: Float32Array) => { obj.oldspec = obj.spec; obj.spec = spec; };
            const deleted = (obj: TestObj) => { ledger.push(obj); };

            // The object under test
            const manager = new ObjectManager<Float32Array, TestObj>(create, update, deleted);
            // Check some internal state
            expect(manager.objectCount.size).to.be(0);

            // Add single object
            const key0 = "key0";
            const spec0 = new Float32Array([3]);
            const obj0 = manager.update(key0, spec0);
            expect(obj0.spec).to.be(spec0);
            expect(manager.objectCount.size).to.be(1);
            expect(manager.objectCount.get(obj0)).to.be(1);

            // Add another object under different key
            const key1 = "key1";
            const spec1 = new Float32Array([5]);
            const obj1 = manager.update(key1, spec1);
            expect(obj1.spec).to.be(spec1);
            expect(manager.objectCount.size).to.be(2);
            expect(manager.objectCount.get(obj1)).to.be(1);

            expect(manager.objectCount.get(obj0)).to.be(1);

            // Passing a new spec for existing function triggers update
            const spec0b = new Float32Array([7]);
            const obj0b = manager.update(key0, spec0b, obj0);
            expect(obj0b.spec).to.be(spec0b);
            expect(obj0b.oldspec).to.be(spec0);
            expect(obj0b).to.be(obj0);
            expect(manager.objectCount.get(obj0)).to.be(1);

            // Passing prev object matching key doesn't do anything
            // const spec1b = new Float32Array([9]);
            // const obj1b = manager.update(key1, spec1b, obj1);
            // expect(obj1b.spec).to.to.beual(spec1b);
            // expect(obj1b.oldspec).to.to.beual(spec1);
            // expect(obj1b).to.to.beual(obj1);

            // Try decrementing object counters and check that delete callback is triggered
            expect(ledger.length).to.be(0);

            const count0 = manager.decrement(obj0);
            expect(count0).to.be(0);
            expect(ledger.length).to.be(1);
            expect(ledger[0]).to.be(obj0);
            expect(manager.objectCount.get(obj1)).to.be(1);

            const count1 = manager.decrement(obj1);
            expect(count1).to.be(0);
            expect(manager.objectCount.get(obj1)).to.be(undefined);
            expect(ledger.length).to.be(2);
            expect(ledger[0]).to.be(obj0);
            expect(ledger[1]).to.be(obj1);
        });
    });
});
