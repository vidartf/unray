"use strict";

import {assert, expect, should} from 'chai';

// FIXME: This doesn't work because the glsl webpack loader isn't applied correctly
import { SurfacePlotModel } from "../src/plotwidgets";

describe('plotwidgets', function() {

    describe('SurfacePlotModel', function() {
        it('should be constructable', function() {
            const plot = new SurfacePlotModel();
            expect(plot._model_name).eq("SurfacePlotModel");
        });
    });

});