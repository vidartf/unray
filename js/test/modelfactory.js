/*
Factory functions for all data widget types for use in tests.

Originally adapted from conftest.py in the python tests.
*/

import * as ndarray from 'ndarray';

import * as dw from "../src/datawidgets";

import { createTestModel } from './testutils';

function linspace(a, b, n) {
    const array = new Float32Array(n);
    for (let i=0; i<n; ++i) {
        const c = i / (n-1);
        array[i] = (1-c)*a + c*b;
    }
    return array;
}

function repeatedLinspace(a, b, n, r) {
    const array = new Float32Array(n*r);
    for (let i=0; i<n; ++i) {
        const c = i / (n-1);
        array[r*i] = (1-c)*a + c*b;
        for (let j=1; j<r; ++j) {
            array[r*i+j] = array[r*i];
        }
    }
    return array;
}

export
function createMesh() {
    /*
    Setup a simple two cell mesh.
    Note that the fixtures for the fields etc.
    below are written for this specific mesh,
    so don't change this. If changes to these
    values are wanted, create a new fixture instead.
    */

    const cells = ndarray(new Int32Array([
        0, 1, 2, 3,
        0, 1, 2, 4,
        ]), [2, 4]);

    const points = ndarray(new Float32Array([
        0, 0, 0,   0, 0, 1,   0, 1, 0,
        1, 0, 0,  -1, 0, 0,
        ]), [5, 3]);

    const attribs = { cells, points };
    return createTestModel(dw.MeshModel, attribs);
}

export
function createP0Field() {
    const mesh = createMesh();
    const values = ndarray(new Float32Array([-3.0, 5.0]));
    const space = "P0";

    const attribs = { mesh, values, space };
    return createTestModel(dw.FieldModel, attribs);
}

export
function createP1Field() {
    const mesh = createMesh();
    const values = ndarray(new Float32Array([0.1, -0.2, 3.0, -4.0, 0.5]));
    const space = "P1";

    const attribs = { mesh, values, space };
    return createTestModel(dw.FieldModel, attribs);
}

export
function createD1Field() {
    const mesh = createMesh();
    const values = ndarray(new Float32Array([0.1, 0.2, 0.3, 0.4, 1.0, 2.0, 3.0, 4.0]));
    const space = "D1";

    const attribs = { mesh, values, space };
    return createTestModel(dw.FieldModel, attribs);
}

export
function createFaceIndicatorField() {
    const mesh = createMesh();
    const shared = 3;  // This is the facet shared between the two cells
    const values = ndarray(new Int32Array([0, 1, 2, shared, 4, 5, 6, shared]));
    const space = "I2";

    const attribs = { mesh, values, space };
    return createTestModel(dw.IndicatorFieldModel, attribs);
}

export
function createCellIndicatorField() {
    const mesh = createMesh();
    const values = ndarray(new Int32Array([10, 20]));
    const space = "I3";

    const attribs = { mesh, values, space };
    return createTestModel(dw.IndicatorFieldModel, attribs);
}

export
function createArrayScalarLUT() {
    const values = ndarray(linspace(0, 1, 16));

    const attribs = { values };
    return createTestModel(dw.ArrayScalarLUTModel, attribs);
}

export
function createArrayColorLUT() {
    const values = ndarray(repeatedLinspace(0, 1, 16, 3));

    const attribs = { values };
    return createTestModel(dw.ArrayColorLUTModel, attribs);
}

export
function createNamedColorLUT() {
    const name = "viridis";

    const attribs = { name };
    return createTestModel(dw.NamedColorLUTModel, attribs);
}

export
function createScalarConstant() {
    const value = 42;

    const attribs = { value };
    return createTestModel(dw.ScalarConstantModel, attribs);
}

export
function createScalarField() {
    const field = createP1Field();
    const lut = createArrayColorLUT();

    const attribs = { field, lut };
    return createTestModel(dw.ScalarFieldModel, attribs);
}

export
function createScalarIndicators() {
    const field = createCellIndicatorField();
    const lut = createArrayColorLUT();

    const attribs = { field, lut };
    return createTestModel(dw.ScalarIndicatorsModel, attribs);
}

export
function createColorConstant() {
    const intensity = 0.5;
    const color = "hsl(300,50%,100%)";

    const attribs = { intensity, color };
    return createTestModel(dw.ColorConstantModel, attribs);
}

export
function createColorField() {
    const field = createP1Field();
    const lut = createArrayColorLUT();

    const attribs = { field, lut };
    return createTestModel(dw.ColorFieldModel, attribs);
}

export
function createCellColorIndicators() {
    const field = createCellIndicatorField();
    const lut = createArrayColorLUT();

    const attribs = { field, lut };
    return createTestModel(dw.ColorIndicatorsModel, attribs);
}

export
function createFaceColorIndicators() {
    const field = createFaceIndicatorField();
    const lut = createArrayColorLUT();

    const attribs = { field, lut };
    return createTestModel(dw.ColorIndicatorsModel, attribs);
}

export
function createWireframeParams() {
    const attribs = {};
    return createTestModel(dw.WireframeParamsModel, attribs);
}

export
function createIsovalueParams() {
    const attribs = {};
    return createTestModel(dw.IsovalueParamsModel, attribs);
}