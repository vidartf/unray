"use strict";

import {assert, expect, should} from 'chai';

import { MeshModel } from "../src/datawidgets";

import { createTestModel } from './testutils';

describe('datawidgets', function() {

    describe('MeshModel', function() {
        it('should be constructable', function() {
            const mesh = createTestModel(MeshModel, {});
            expect(mesh.get('_model_name')).eq("MeshModel");
        });
    });

});
