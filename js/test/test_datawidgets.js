"use strict";

import {assert, expect, should} from 'chai';

import { MeshModel } from "../src/datawidgets";

// FIXME: This doesn't work, figure out how to unit test widget models, getting:
//Uncaught TypeError: Cannot read property 'WidgetModel' of undefined
//at test/index.js:115420

describe('datawidgets', function() {

    describe('MeshModel', function() {
        it('should be constructable', function() {
            const mesh = new MeshModel();
            expect(mesh._model_name).eq("MeshModel");
        });
    });

});