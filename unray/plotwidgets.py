import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register
from ipydatawidgets import DataUnion
import pythreejs
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version

from .datawidgets import Mesh, Field, IndicatorField
from .datawidgets import WireframeParams
from .datawidgets import ScalarLUT, ArrayScalarLUT #, NamedScalarLUT
from .datawidgets import Scalar, ScalarConstant, ScalarField, ScalarIndicators
from .datawidgets import ColorLUT, ArrayColorLUT, NamedColorLUT
from .datawidgets import Color, ColorConstant, ColorField, ColorIndicators


@register
class Plot(pythreejs.Blackbox):
    """Base class for all plot widgets."""
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)


@register
class SurfacePlot(Plot):
    """A surface plot widget."""
    _model_name = Unicode('SurfacePlotModel').tag(sync=True)

    # Mesh must currently always be set
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)

    # Indicators can optionally mark which cells or facets to include
    # TODO: Validate IndicatorField spaces: ["I3", "I2"]
    restrict = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)

    # Color can be a constant or a field with color mapping
    color = Instance(Color, allow_none=True).tag(sync=True, **widget_serialization)

    # Wireframe parameters are packed in their own model, None means disabled
    wireframe = Instance(WireframeParams, allow_none=True).tag(sync=True, **widget_serialization)


@register
class IsoSurfacePlot(Plot):
    """An isosurface plot widget."""
    _model_name = Unicode('IsoSurfacePlotModel').tag(sync=True)

    # Mesh must currently always be set
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)

    # Indicators can optionally mark which cells or facets to include
    # TODO: Validate IndicatorField spaces: ["I3", "I2"]
    restrict = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)

    # Color can be a constant or a field with color mapping
    color = Instance(Color, allow_none=False).tag(sync=True, **widget_serialization)

    # TODO


@register
class XrayPlot(Plot):
    """An xray plot widget"""
    _model_name = Unicode('XrayPlotModel').tag(sync=True)

    # Mesh must currently always be set
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)

    # Indicators can optionally mark which cells or facets to include
    # TODO: Validate IndicatorField spaces: ["I3", "I2"]
    restrict = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)

    # Density can be a constant or a scalar field with scalar mapping
    density = Instance(Scalar, allow_none=True).tag(sync=True, **widget_serialization)

    # Constant color to absorb through
    #color = Instance(ColorConstant, allow_none=True).tag(sync=True, **widget_serialization)

    # TODO


@register
class MinPlot(Plot):
    """A volumetric minimum intensity projection plot widget."""
    _model_name = Unicode('MinPlotModel').tag(sync=True)

    # Mesh must currently always be set
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)

    # Indicators can optionally mark which cells or facets to include
    # TODO: Validate IndicatorField spaces: ["I3", "I2"]
    restrict = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)

    # Color field with color mapping
    color = Instance(ColorField, allow_none=False).tag(sync=True, **widget_serialization)

    # TODO


@register
class MaxPlot(Plot):
    """A volumetric maximum intensity projection plot widget."""
    _model_name = Unicode('MaxPlotModel').tag(sync=True)

    # Mesh must currently always be set
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)

    # Indicators can optionally mark which cells or facets to include
    # TODO: Validate IndicatorField spaces: ["I3", "I2"]
    restrict = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)

    # Color field with color mapping
    color = Instance(ColorField, allow_none=False).tag(sync=True, **widget_serialization)

    # TODO


@register
class SumPlot(Plot):
    """A volumetric pure emission projection plot widget."""
    _model_name = Unicode('SumPlotModel').tag(sync=True)

    # Mesh must currently always be set
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)

    # Indicators can optionally mark which cells or facets to include
    # TODO: Validate IndicatorField spaces: ["I3", "I2"]
    restrict = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)

    # Color field with color mapping
    color = Instance(ColorField, allow_none=False).tag(sync=True, **widget_serialization)

    # TODO


@register
class VolumePlot(Plot):
    """A direct volumetric rendering widget with a full emission-absorption model."""
    _model_name = Unicode('VolumePlotModel').tag(sync=True)

    # Mesh must currently always be set
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)

    # Indicators can optionally mark which cells or facets to include
    # TODO: Validate IndicatorField spaces: ["I3", "I2"]
    restrict = Instance(IndicatorField, allow_none=True).tag(sync=True, **widget_serialization)

    # Color field with color mapping
    color = Instance(ColorField, allow_none=False).tag(sync=True, **widget_serialization)

    # Density can be a constant or a scalar field with scalar mapping
    # TODO: Field is not all these things, use Scalar
    density = Instance(Scalar, allow_none=False).tag(sync=True, **widget_serialization)

    # TODO
