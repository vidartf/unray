"use strict";

import {assert, expect, should} from 'chai';

import { MeshModel } from "../src/datawidgets";

import { createTestModel } from './testutils';

import * as factory from "./modelfactory";

describe('datawidgets', function() {

    describe('MeshModel', function() {
        it('should be constructable', function() {
            const model = factory.createMesh();
            expect(model.get('_model_name')).eq("MeshModel");
        });
    });

    describe('FieldModel', function() {
        it('should be constructable in P0 space', function() {
            const model = factory.createP0Field();
            expect(model.get('_model_name')).eq("FieldModel");
        });
        it('should be constructable in P1 space', function() {
            const model = factory.createP1Field();
            expect(model.get('_model_name')).eq("FieldModel");
        });
        it('should be constructable in D1 space', function() {
            const model = factory.createP1Field();
            expect(model.get('_model_name')).eq("FieldModel");
        });
    });

    describe('IndicatorFieldModel', function() {
        it('should be constructable in I2 space', function() {
            const model = factory.createFaceIndicatorField();
            expect(model.get('_model_name')).eq("IndicatorFieldModel");
        });
        it('should be constructable in I3 space', function() {
            const model = factory.createCellIndicatorField();
            expect(model.get('_model_name')).eq("IndicatorFieldModel");
        });
    });

    describe('ArrayScalarLUT', function() {
        it('should be constructable', function() {
            const model = factory.createArrayScalarLUT();
            expect(model.get('_model_name')).eq("ArrayScalarLUTModel");
        });
    });

    describe('ArrayColorLUT', function() {
        it('should be constructable', function() {
            const model = factory.createArrayColorLUT();
            expect(model.get('_model_name')).eq("ArrayColorLUTModel");
        });
    });

    describe('NamedColorLUT', function() {
        it('should be constructable', function() {
            const model = factory.createNamedColorLUT();
            expect(model.get('_model_name')).eq("NamedColorLUTModel");
        });
    });

});