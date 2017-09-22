"use strict";

import {assert, expect, should} from 'chai';

import * as ndarray from 'ndarray';

import { MeshModel } from "../src/datawidgets";
import { SurfacePlotModel } from "../src/plotwidgets";

import { createTestModel } from './testutils';

import * as factory from "./modelfactory";


describe('plotwidgets', function() {

    describe('SurfacePlotModel', function() {

        it('should be constructable', function() {
            const mesh = factory.createMesh();
            const plot = createTestModel(SurfacePlotModel, {mesh});
            expect(plot.get('_model_name')).eq("SurfacePlotModel");
        });

    });

});
