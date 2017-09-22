"use strict";

import {assert, expect, should} from 'chai';

import { MeshModel } from "../src/datawidgets";

import { createTestModel } from './testutils';

import * as factory from "./modelfactory";

describe('datawidgets', function() {

    describe('MeshModel', function() {
        it('should be constructable', function() {
            const model = factory.mesh();
            expect(model.get('_model_name')).eq("MeshModel");
        });
    });
/*
    describe('FieldModel', function() {
        it('should be constructable', function() {
            const model = factory.field();
            expect(model.get('_model_name')).eq("FieldModel");
        });
    });
*/
});