/*
Factory functions for all data widget types for use in tests.

Originally adapted from conftest.py in the python tests.
*/

import * as ndarray from 'ndarray';

import * as dw from "../src/datawidgets";

import { createTestModel } from './testutils';

export
function mesh() {
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

/*  // TODO: Convert these as well
@pytest.fixture
def p0field(mesh):
    values = np.asarray([-3.0, 5.0], dtype="float32")
    return ur.Field(mesh=mesh, values=values, space="P0")

@pytest.fixture
def p1field(mesh):
    values = np.asarray([0.1, -0.2, 3.0, -4.0, 0.5], dtype="float32")
    return ur.Field(mesh=mesh, values=values, space="P1")

@pytest.fixture
def d1field(mesh):
    values = np.asarray([0.1, 0.2, 0.3, 0.4, 1.0, 2.0, 3.0, 4.0], dtype="float32")
    return ur.Field(mesh=mesh, values=values, space="D1")

@pytest.fixture
def face_indicators(mesh):
    shared = 3  # This is the facet shared between the two cells
    values = np.asarray([0, 1, 2, shared, 4, 5, 6, shared], dtype="int32")
    return ur.IndicatorField(mesh=mesh, values=values, space="I2")

@pytest.fixture
def cell_indicators(mesh):
    values = np.asarray([10, 20], dtype="int32")
    return ur.IndicatorField(mesh=mesh, values=values, space="I3")

@pytest.fixture
def array_scalar_lut():
    values = np.linspace(0.0, 1.0, 16, dtype="float32")
    return ur.ArrayScalarLUT(values=values)

@pytest.fixture
def array_color_lut():
    values = np.zeros((16, 3), dtype="float32")
    values[:, 0] = np.linspace(0.0, 1.0, 16, dtype="float32")
    values[:, 1] = np.linspace(0.0, 1.0, 16, dtype="float32")
    values[:, 2] = np.linspace(0.0, 1.0, 16, dtype="float32")
    return ur.ArrayColorLUT(values=values)

@pytest.fixture
def named_color_lut():
    name = "viridis"
    return ur.NamedColorLUT(name=name)

@pytest.fixture
def scalar_constant():
    return ur.ScalarConstant(value=42.0)

@pytest.fixture
def scalar_field(p1field, array_scalar_lut):
    return ur.ScalarField(field=p1field, lut=array_scalar_lut)

@pytest.fixture
def scalar_indicators(cell_indicators, array_scalar_lut):
    return ur.ScalarIndicators(field=cell_indicators, lut=array_scalar_lut)

@pytest.fixture
def color_constant():
    return ur.ColorConstant(intensity=0.5, color=r"hsl(300,50%,100%)")

@pytest.fixture
def color_field(p1field, array_color_lut):
    return ur.ColorField(field=p1field, lut=array_color_lut)

@pytest.fixture
def cell_color_indicators(cell_indicators, array_color_lut):
    return ur.ColorIndicators(field=cell_indicators, lut=array_color_lut)

@pytest.fixture
def face_color_indicators(face_indicators, array_color_lut):
    return ur.ColorIndicators(field=face_indicators, lut=array_color_lut)

@pytest.fixture
def wireframe_params():
    return ur.WireframeParams()

@pytest.fixture
def isovalue_params():
    return ur.IsovalueParams()
*/