"use strict";

import {assert, expect, should} from 'chai';

import { MeshModel } from "../src/datawidgets";
import { SurfacePlotModel } from "../src/plotwidgets";

import { createTestModel } from './testutils';

import * as ndarray from 'ndarray';

describe('plotwidgets', function() {

    describe('SurfacePlotModel', function() {

        it('should be constructable', function() {
            const mesh = createTestModel(MeshModel, {
                cells: ndarray([0, 1, 2, 3]),
                points: ndarray([0, 0, 0]),
            });
            const plot = createTestModel(SurfacePlotModel, {mesh});
            expect(plot.get('_model_name')).eq("SurfacePlotModel");
        });

    });

});
