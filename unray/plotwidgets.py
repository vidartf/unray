import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register
from ipydatawidgets import DataUnion
import pythreejs
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version

from .datawidgets import Mesh, Field, IndicatorField
from .datawidgets import ColorLUT, ArrayColorLUT, NamedColorLUT
from .datawidgets import Color, ColorConstant, ColorField, ColorIndicators


@register
class Plot(pythreejs.Blackbox):
    """Base class for all plot widgets."""
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)


@register
class WireframePlot(Plot):  # TODO: Drop this, surface should cover all the functionality
    """A wireframe plot widget."""
    _model_name = Unicode('WireframePlotModel').tag(sync=True)
    #_model_module = Unicode(widget_module_name).tag(sync=True)
    #_model_module_version = Unicode(widget_module_version).tag(sync=True)
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)
    #restrict = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization) # TODO: Validate field spaces: ["I3", "I2"]
    wireframe = CBool(True).tag(sync=True)
    edgesize = CFloat(0.001).tag(sync=True)
    # TODO


@register
class SurfacePlot(Plot):
    """A surface plot widget."""
    _model_name = Unicode('SurfacePlotModel').tag(sync=True)
    color = Instance(Color, allow_none=False).tag(sync=True, **widget_serialization)
    #restrict = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization) # TODO: Validate field spaces: ["I3", "I2"]
    wireframe = CBool(False).tag(sync=True)
    edgesize = CFloat(0.001).tag(sync=True)
    # TODO


@register
class IsoSurfacePlot(Plot):
    """An isosurface plot widget."""
    _model_name = Unicode('IsoSurfacePlotModel').tag(sync=True)
    # TODO


@register
class XrayPlot(Plot):
    """An xray plot widget"""
    _model_name = Unicode('XrayPlotModel').tag(sync=True)
    density = Instance(Field, allow_none=False).tag(sync=True, **widget_serialization)
    #color = Instance(ColorConstant, allow_none=False).tag(sync=True, **widget_serialization)
    #restrict = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization)  # TODO: Validate field spaces: ["I3", "I2"]
    # TODO


@register
class MinPlot(Plot):
    """A volumetric minimum intensity projection plot widget."""
    _model_name = Unicode('MinPlotModel').tag(sync=True)
    # TODO


@register
class MaxPlot(Plot):
    """A volumetric maximum intensity projection plot widget."""
    _model_name = Unicode('MaxPlotModel').tag(sync=True)
    # TODO


@register
class SumPlot(Plot):
    """A volumetric pure emission projection plot widget."""
    _model_name = Unicode('SumPlotModel').tag(sync=True)
    # TODO


@register
class VolumePlot(Plot):
    """A direct volumetric rendering widget with a full emission-absorption model."""
    _model_name = Unicode('VolumePlotModel').tag(sync=True)
    # TODO
