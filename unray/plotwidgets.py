import numpy as np

import ipywidgets as widgets
from ipywidgets import widget_serialization, register, Color

from ipydatawidgets import DataUnion

# Hack to make basic construction of objects work in tests
# on travis while pythreejs branch is hard to install
try:
    import pythreejs
    Blackbox = pythreejs.Blackbox
except:
    Blackbox = widgets.Widget

from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined

from ._version import widget_module_name, widget_module_version

from .datawidgets import Mesh, Field, IndicatorField
from .datawidgets import ScalarLUT, ArrayScalarLUT #, NamedScalarLUT
from .datawidgets import ScalarValued, ScalarConstant, ScalarField, ScalarIndicators
from .datawidgets import ColorLUT, ArrayColorLUT, NamedColorLUT
from .datawidgets import ColorValued, ColorConstant, ColorField, ColorIndicators
from .datawidgets import WireframeParams, IsovalueParams

from .datawidgets import _gather_dashboards, _make_accordion


@register
class Plot(Blackbox):
    """Base class for all plot widgets."""
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)

    # Mesh must currently always be set
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)

    # Indicators can optionally mark which cells or facets to include
    # TODO: Validate IndicatorField spaces: ["I3", "I2"]
    restrict = Instance(ScalarIndicators, allow_none=True).tag(sync=True, **widget_serialization)


@register
class SurfacePlot(Plot):
    """A surface plot widget."""
    _model_name = Unicode('SurfacePlotModel').tag(sync=True)

    # Color can be a constant or a field with color mapping
    color = Instance(ColorValued, allow_none=True).tag(sync=True, **widget_serialization)

    # Wireframe parameters are packed in their own model, None means disabled
    wireframe = Instance(WireframeParams, allow_none=True).tag(sync=True, **widget_serialization)

    def dashboard(self):
        "Create a combined dashboard for this plot."
        names = ["restrict", "color", "wireframe"]
        children, titles = _gather_dashboards(self, names)
        return _make_accordion(children, titles)


@register
class IsosurfacePlot(Plot):
    """An isosurface plot widget."""
    _model_name = Unicode('IsosurfacePlotModel').tag(sync=True)

    # Color can be a constant or a field with color mapping
    color = Instance(ColorValued, allow_none=False).tag(sync=True, **widget_serialization)

    # Scalar field to produce isosurfaces of, if different from color field
    field = Instance(Field, allow_none=True).tag(sync=True, **widget_serialization)

    # Configuration of values to show
    values = Instance(IsovalueParams, allow_none=False).tag(sync=True, **widget_serialization)

    def dashboard(self):
        "Create a combined dashboard for this plot."
        names = ["restrict", "color", "field", "values"]
        children, titles = _gather_dashboards(self, names)
        return _make_accordion(children, titles)


@register
class XrayPlot(Plot):
    """An xray plot widget"""
    _model_name = Unicode('XrayPlotModel').tag(sync=True)

    # Density can be a constant or a scalar field with scalar mapping
    density = Instance(ScalarValued, allow_none=True).tag(sync=True, **widget_serialization)

    # Extinction rate constant
    # TODO: Validate positive
    extinction = CFloat(1.0).tag(sync=True)

    # Constant color to weight absorption
    # TODO: To do this properly need some other blend equation setup
    #color = Color("#ffffff").tag(sync=True)

    def dashboard(self):
        "Create a combined dashboard for this plot."
        names = ["restrict", "density"]
        children, titles = _gather_dashboards(self, names)

        w = widgets.FloatSlider(value=self.extinction, min=0, max=5, description="Extinction")
        widgets.jslink((w, "value"), (self, "extinction"))
        children.append(w)
        titles.append("Extinction")

        # w = widgets.ColorPicker(value=self.color)
        # widgets.jslink((w, "value"), (self, "color"))
        # children.append(w)
        # titles.append("Color")

        return _make_accordion(children, titles)


@register
class MinPlot(Plot):
    """A volumetric minimum intensity projection plot widget."""
    _model_name = Unicode('MinPlotModel').tag(sync=True)

    # Color field with color mapping
    color = Instance(ColorField, allow_none=False).tag(sync=True, **widget_serialization)

    def dashboard(self):
        "Create a combined dashboard for this plot."
        names = ["restrict", "color"]
        children, titles = _gather_dashboards(self, names)
        return _make_accordion(children, titles)


@register
class MaxPlot(Plot):
    """A volumetric maximum intensity projection plot widget."""
    _model_name = Unicode('MaxPlotModel').tag(sync=True)

    # Color field with color mapping
    color = Instance(ColorField, allow_none=False).tag(sync=True, **widget_serialization)

    def dashboard(self):
        "Create a combined dashboard for this plot."
        children, titles = _gather_dashboards(self, ["restrict", "color"])
        return _make_accordion(children, titles)


@register
class SumPlot(Plot):
    """A volumetric pure emission projection plot widget."""
    _model_name = Unicode('SumPlotModel').tag(sync=True)

    # Color field with color mapping or constant color
    color = Instance(ColorValued, allow_none=False).tag(sync=True, **widget_serialization)

    # Exposure level (color is scaled by 2**exposure)
    # TODO: Validate in range [-10, 10]
    exposure = CFloat(0.0).tag(sync=True)

    def dashboard(self):
        "Create a combined dashboard for this plot."
        children, titles = _gather_dashboards(self, ["restrict", "color"])

        w = widgets.FloatSlider(value=self.exposure, min=-4, max=+4, description="Exposure")
        widgets.jslink((w, "value"), (self, "exposure"))
        children.append(w)
        titles.append("Exposure")

        return _make_accordion(children, titles)


@register
class VolumePlot(Plot):
    """A direct volumetric rendering widget with a full emission-absorption model."""
    _model_name = Unicode('VolumePlotModel').tag(sync=True)

    # Color field with color mapping or a constant color
    color = Instance(ColorValued, allow_none=False).tag(sync=True, **widget_serialization)

    # Density can be a constant or a scalar field with scalar mapping
    density = Instance(ScalarValued, allow_none=False).tag(sync=True, **widget_serialization)

    # Extinction rate constant
    # TODO: Validate positive
    extinction = CFloat(1.0).tag(sync=True)

    # Exposure level (color is scaled by 2**exposure)
    # TODO: Validate in range [-10, 10]
    exposure = CFloat(0.0).tag(sync=True)

    def dashboard(self):
        "Create a combined dashboard for this plot."
        children, titles = _gather_dashboards(self, ["restrict", "color"])

        w = widgets.FloatSlider(value=self.extinction, min=0, max=5, description="Extinction")
        widgets.jslink((w, "value"), (self, "extinction"))
        children.append(w)
        titles.append("Extinction")

        w = widgets.FloatSlider(value=self.exposure, min=-4, max=+4, description="Exposure")
        widgets.jslink((w, "value"), (self, "exposure"))
        children.append(w)
        titles.append("Exposure")

        return _make_accordion(children, titles)
