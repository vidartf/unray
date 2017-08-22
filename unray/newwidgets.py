import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register
from ipydatawidgets import NDArrayWidget
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version


from .datawidgets import Mesh
from .plotwidgets import Plot, WireframePlot


field_types = ["P0", "P1", "D1"]

@register
class Field(widgets.Widget):
    """TODO: Document me."""
    _model_name = Unicode('Field').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)
    values = Instance(NDArrayWidget, allow_none=False).tag(sync=True, **widget_serialization)
    space = Enum(field_types, "P1").tag(sync=True)


indicator_field_types = ["I0", "I1", "I2", "I3"]

@register
class IndicatorField(widgets.Widget):
    """TODO: Document me."""
    _model_name = Unicode('IndicatorField').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)
    values = Instance(NDArrayWidget, allow_none=False).tag(sync=True, **widget_serialization)
    space = Enum(indicator_field_types, "I3").tag(sync=True)


@register
class ColorLUT(widgets.Widget):
    """TODO: Document me."""
    _model_name = Unicode('ColorLUT').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)


@register
class ArrayColorLUT(ColorLUT):
    """TODO: Document me."""
    _model_name = Unicode('ArrayColorLUT').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    values = Instance(NDArrayWidget).tag(sync=True, **widget_serialization)
    space = Enum(["rgb", "hsv"], "rgb").tag(sync=True)

# TODO: Develop color lookup methods further, rgb, hsv, nominal vs quantitiative, etc etc...
# TODO: Use scale widgets when available

@register
class NamedColorLUT(ColorLUT):
    """TODO: Document me."""
    _model_name = Unicode('NamedColorLUT').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    name = Unicode("viridis").tag(sync=True)


@register
class Color(widgets.Widget):
    """TODO: Document me."""
    _model_name = Unicode('Color').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)


@register
class ColorConstant(Color):
    """TODO: Document me."""
    _model_name = Unicode('ColorConstant').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)

    # Constant value if no field is provided
    constant = Unicode("#888888").tag(sync=True)


@register
class ColorField(Color):
    """TODO: Document me."""
    _model_name = Unicode('ColorField').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)

    field = Instance(Field, allow_none=True).tag(sync=True, **widget_serialization)
    lut = Instance(ColorLUT, allow_none=True).tag(sync=True, **widget_serialization)


@register
class ColorIndicators(Color):
    """TODO: Document me."""
    _model_name = Unicode('ColorIndicators').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)

    # TODO: Validate field spaces: ["I2", "I3"]
    field = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)
    lut = Instance(ColorLUT, allow_none=True).tag(sync=True, **widget_serialization)



@register
class SurfacePlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('SurfacePlot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    color = Instance(Color, allow_none=False).tag(sync=True, **widget_serialization)
    restrict = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization) # TODO: Validate field spaces: ["I3", "I2"]
    wireframe = CBool(False).tag(sync=True)
    edgesize = CFloat(0.001).tag(sync=True)
    # TODO


@register
class IsoSurfacePlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('IsoSurfacePlot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    # TODO


@register
class XrayPlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('XrayPlot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    density = Instance(Field, allow_none=False).tag(sync=True, **widget_serialization)
    color = Instance(ColorConstant, allow_none=False).tag(sync=True, **widget_serialization)
    restrict = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization)  # TODO: Validate field spaces: ["I3", "I2"]
    # TODO


@register
class MinProjPlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('MinProjPlot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    # TODO


@register
class MaxProjPlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('MaxProjPlot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    # TODO


@register
class SumProjPlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('SumProjPlot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    # TODO


@register
class VolumePlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('VolumePlot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    # TODO


# def as_array_widget(values):
#     if values is None:
#         return None
#     if isinstance(values, NDArrayWidget):
#         return values
#     return NDArrayWidget(values)


def surf(field, restrict=None):
    "TODO: Design and document."
    lut = ColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict, wireframe=False)
    return SurfacePlot(**kwargs)


def wireframe(field, restrict=None):
    "TODO: Design and document."
    lut = ColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict, wireframe=True)
    return SurfacePlot(**kwargs)


def xray(field, restrict=None):
    "TODO: Design and document."
    kwargs = dict(density=field, restrict=restrict)
    return XrayPlot(**kwargs)


def minproj(field, restrict=None):
    "TODO: Design and document."
    lut = ColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return MinProjPlot(**kwargs)


def maxproj(field, restrict=None):
    "TODO: Design and document."
    lut = ColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return MaxProjPlot(**kwargs)


def sumproj(field, restrict=None):
    "TODO: Design and document."
    lut = ColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return SumProjPlot(**kwargs)


def volume(field, restrict=None):
    "TODO: Design and document."
    lut0 = ScalarLut(values=[0,0,0, 1,1,1])
    density = ScalarField(field=field, lut=lut0)
    lut1 = ColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(density=density, color=color, restrict=restrict)
    return VolumePlot(**kwargs)
