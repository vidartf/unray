import pytest
import numpy as np
import unray as ur

def test_mesh(mesh):
    assert mesh.cells.shape[1] == 4
    assert mesh.points.shape[1] == 3

def test_p0field(p0field):
    mesh = p0field.mesh
    nc = mesh.cells.shape[0]
    assert p0field.space == "P0"
    assert p0field.values.shape[0] == nc

def test_p1field(p1field):
    mesh = p1field.mesh
    np = mesh.points.shape[0]
    assert p1field.space == "P1"
    assert p1field.values.shape[0] == np

def test_d1field(d1field):
    mesh = d1field.mesh
    nc = mesh.cells.shape[0]
    assert d1field.space == "D1"
    assert d1field.values.shape[0] == nc*4

def test_face_indicator_field(face_indicators):
    mesh = face_indicators.mesh
    nc = mesh.cells.shape[0]
    assert face_indicators.values.shape[0] == nc*4
    assert face_indicators.space == "I2"

def test_cell_indicator_field(cell_indicators):
    mesh = cell_indicators.mesh
    nc = mesh.cells.shape[0]
    assert cell_indicators.values.shape[0] == nc
    assert cell_indicators.space == "I3"

def test_array_scalar_lut(array_scalar_lut):
    assert array_scalar_lut.values.dtype == "float32"
    assert len(array_scalar_lut.values.shape) == 1

def test_array_color_lut(array_color_lut):
    assert array_color_lut.values.dtype == "float32"
    assert len(array_color_lut.values.shape) == 2
    assert array_color_lut.values.shape[1] == 3

def test_named_color_lut(named_color_lut):
    # TODO: Add a list of valid names to the widget for checking.
    assert named_color_lut.name == "viridis"

def test_scalar_constant(scalar_constant):
    assert scalar_constant.value == 42.0

def test_scalar_field(scalar_field):
    assert scalar_field.field._model_name == "FieldModel"
    assert scalar_field.lut._model_name == "ArrayScalarMapModel"

def test_scalar_indicators(scalar_indicators):
    assert scalar_indicators.field._model_name == "IndicatorFieldModel"
    assert scalar_indicators.lut._model_name == "ArrayScalarMapModel"

def test_color_constant(color_constant):
    assert 0.0 <= color_constant.intensity <= 1.0
    assert isinstance(color_constant.color, str)

def test_color_field(color_field):
    assert color_field.field._model_name == "FieldModel"
    assert color_field.lut._model_name == "ArrayColorMapModel"

def test_cell_color_indicators(cell_color_indicators):
    assert cell_color_indicators.field._model_name == "IndicatorFieldModel"
    assert cell_color_indicators.lut._model_name == "ArrayColorMapModel"

def test_face_color_indicators(face_color_indicators):
    assert face_color_indicators.field._model_name == "IndicatorFieldModel"
    assert face_color_indicators.lut._model_name == "ArrayColorMapModel"

def test_wireframe_params(wireframe_params):
    expected = [
        ("enable", True),
        ("size", 0.01),
        ("color", "#000000"),
        ("opacity", 1.0),
    ]
    for k, v in expected:
        assert getattr(wireframe_params, k) == v

def test_isovalue_params(isovalue_params):
    expected = [
        ("mode", "single"),
        ("value", 0.0),
        ("num_intervals", 0),
        ("spacing", 1.0),
        ("period", 3.0),
    ]
    for k, v in expected:
        assert getattr(isovalue_params, k) == v
