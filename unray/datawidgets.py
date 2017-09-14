import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register
from ipydatawidgets import DataUnion, data_union_serialization, shape_constraints
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version

# List of valid field types
field_types = ("P0", "P1", "D1")

# List of valid indicator field types
indicator_field_types = ("I0", "I1", "I2", "I3")


class BaseWidget(widgets.Widget):
    # Abstract class, don't register, and don't set name
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)


@register
class Mesh(BaseWidget):
    """Representation of an unstructured mesh."""
    _model_name = Unicode('MeshModel').tag(sync=True)
    auto_orient = CBool(True).tag(sync=True)
    cells = DataUnion(dtype=np.int32, shape_constraint=shape_constraints(None, 4)).tag(sync=True)    
    points = DataUnion(dtype=np.float32, shape_constraint=shape_constraints(None, 3)).tag(sync=True)


@register
class Field(BaseWidget):
    """Representation of a discrete scalar field over a mesh."""
    _model_name = Unicode('FieldModel').tag(sync=True)
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)
    values = DataUnion(dtype=np.float32, shape_constraint=shape_constraints(None)).tag(sync=True, **data_union_serialization)
    space = Enum(field_types, "P1").tag(sync=True)


@register
class IndicatorField(BaseWidget):
    """Representation of a set of nominal indicator values for each mesh entity."""
    _model_name = Unicode('IndicatorFieldModel').tag(sync=True)
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)
    values = DataUnion(dtype=np.int32, shape_constraint=shape_constraints(None)).tag(sync=True, **data_union_serialization)
    space = Enum(indicator_field_types, "I3").tag(sync=True)


class ColorLUT(BaseWidget):
    """TODO: Document me."""
    # Abstract class, don't register, and don't set name


@register
class ArrayColorLUT(ColorLUT):
    """TODO: Document me."""
    _model_name = Unicode('ArrayColorLUTModel').tag(sync=True)
    values = DataUnion(dtype=np.float32, shape_constraint=shape_constraints(None, 3)).tag(sync=True, **data_union_serialization)
    space = Enum(["rgb", "hsv"], "rgb").tag(sync=True)

# TODO: Develop color lookup methods further, rgb, hsv, nominal vs quantitiative, etc etc...
# TODO: Use scale widgets when available

@register
class NamedColorLUT(ColorLUT):
    """TODO: Document me."""
    _model_name = Unicode('NamedColorLUTModel').tag(sync=True)
    name = Unicode("viridis").tag(sync=True)


class Color(BaseWidget):
    """TODO: Document me."""
    # Abstract class, don't register, and don't set name
    pass


@register
class ColorConstant(Color):
    """TODO: Document me."""
    _model_name = Unicode('ColorConstantModel').tag(sync=True)

    # Constant value if no field is provided
    constant = Unicode("#888888").tag(sync=True)


@register
class ColorField(Color):
    """TODO: Document me."""
    _model_name = Unicode('ColorFieldModel').tag(sync=True)

    field = Instance(Field, allow_none=True).tag(sync=True, **widget_serialization)
    lut = Instance(ColorLUT, allow_none=True).tag(sync=True, **widget_serialization)


@register
class ColorIndicators(Color):
    """TODO: Document me."""
    _model_name = Unicode('ColorIndicatorsModel').tag(sync=True)

    # TODO: Validate field spaces: ["I2", "I3"]
    field = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)
    lut = Instance(ColorLUT, allow_none=True).tag(sync=True, **widget_serialization)
