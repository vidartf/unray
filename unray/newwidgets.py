"""

This file contains fairly realistic drafts of the new data and plot widget redesign.

The plan is to pick one by one of these,
move it to datawidgets.py or plotwidgets.py,
iterate on its design, and implement the corresponding
model class in datawidgets.js or plotwidgets.js.

Array traits should be changed to use DataUnion when classes are moved.

At the bottom here are some drafts of high level plot functions
that can be moved to unlab.py and finalized as the

"""
import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register
from ipydatawidgets import DataUnion, shape_constraints, data_union_serialization
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version


from .datawidgets import Mesh
from .plotwidgets import Plot, WireframePlot


field_types = ["P0", "P1", "D1"]

class BaseWidget(widgets.Widget):
    # Abstract class, don't register, and don't set name
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)


@register
class Field(BaseWidget):
    """TODO: Document me."""
    _model_name = Unicode('FieldModel').tag(sync=True)
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)
    values = DataUnion(dtype=np.float32, shape_constraint=shape_constraints(None)).tag(sync=True, **data_union_serialization)
    space = Enum(field_types, "P1").tag(sync=True)


indicator_field_types = ["I0", "I1", "I2", "I3"]

@register
class IndicatorField(BaseWidget):
    """TODO: Document me."""
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



@register
class SurfacePlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('SurfacePlotModel').tag(sync=True)
    color = Instance(Color, allow_none=False).tag(sync=True, **widget_serialization)
    restrict = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization) # TODO: Validate field spaces: ["I3", "I2"]
    wireframe = CBool(False).tag(sync=True)
    edgesize = CFloat(0.001).tag(sync=True)
    # TODO


@register
class IsoSurfacePlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('IsoSurfacePlotModel').tag(sync=True)
    # TODO


@register
class XrayPlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('XrayPlotModel').tag(sync=True)
    density = Instance(Field, allow_none=False).tag(sync=True, **widget_serialization)
    color = Instance(ColorConstant, allow_none=False).tag(sync=True, **widget_serialization)
    restrict = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization)  # TODO: Validate field spaces: ["I3", "I2"]
    # TODO


@register
class MinProjPlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('MinProjPlotModel').tag(sync=True)
    # TODO


@register
class MaxProjPlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('MaxProjPlotModel').tag(sync=True)
    # TODO


@register
class SumProjPlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('SumProjPlotModel').tag(sync=True)
    # TODO


@register
class VolumePlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('VolumePlotModel').tag(sync=True)
    # TODO


# def as_array_widget(values):
#     if values is None:
#         return None
#     if isinstance(values, NDArrayWidget):
#         return values
#     return NDArrayWidget(values)


def surf(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ArrayColorLUT(values=[[0,0,0], [1,1,1]])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict, wireframe=False)
    return SurfacePlot(**kwargs)


def wireframe(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ArrayColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict, wireframe=True)
    return SurfacePlot(**kwargs)


def xray(field, restrict=None):
    "TODO: Design and document."
    kwargs = dict(density=field, restrict=restrict)
    return XrayPlot(**kwargs)


def minproj(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ArrayColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return MinProjPlot(**kwargs)


def maxproj(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ArrayColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return MaxProjPlot(**kwargs)


def sumproj(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ColorLUArrayColorLUTT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return SumProjPlot(**kwargs)


def volume(field, restrict=None):
    "TODO: Design and document."
    lut0 = ScalarLut(values=[0,0,0, 1,1,1])
    density = ScalarField(field=field, lut=lut0)
    lut1 = ArrayColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(density=density, color=color, restrict=restrict)
    return VolumePlot(**kwargs)
