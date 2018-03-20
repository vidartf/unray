import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register, Color
from ipydatawidgets import DataUnion, data_union_serialization, shape_constraints
import traitlets
from traitlets import Unicode, CFloat, CInt, CBool, Enum, Union
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version


def _gather_dashboards(self, names):
    children = []
    titles = []
    for name in names:
        trait = getattr(self, name)
        if trait and hasattr(trait, "dashboard"):
            children.append(trait.dashboard())
            titles.append(name)
    return children, titles


def _make_accordion(children, titles):
    accordion = widgets.Accordion(children=children)
    for i, title in enumerate(titles):
        accordion.set_title(i, title)
    return accordion


# List of valid field types
field_types = ("P0", "P1", "D1")

# List of valid indicator field types
indicator_field_types = ("I0", "I1", "I2", "I3")

# List of valid colormap names  # TODO: Add all valid colormap names to this list
colormap_names = ("viridis", "fixme")

# List of valid isosurface types
isosurface_types = ("single", "linear", "log", "power", "sweep")


class BaseWidget(widgets.Widget):
    # Abstract class, don't register, and don't set name
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)


# ------------------------------------------------------


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


# ------------------------------------------------------
# TODO: Lookup tables for scalars and colors should be
# developed further in ipyscales or shared with some other project

class Map(BaseWidget):
    """Representation of a lookup table."""
    # Abstract class, don't register, and don't set name


class ScalarMap(Map):
    """Representation of a scalar lookup table."""
    # Abstract class, don't register, and don't set name


@register
class ArrayScalarMap(ScalarMap):
    """Representation of a scalar lookup table by an array of values."""
    _model_name = Unicode('ArrayScalarMapModel').tag(sync=True)
    values = DataUnion(dtype=np.float32, shape_constraint=shape_constraints(None)).tag(sync=True, **data_union_serialization)

    # TODO: Handle linear/log scaled Maps somehow:
    #space = Enum(["linear", "log", "power"], "linear").tag(sync=True)

    # TODO: Pair colors with domain values (Map is a mapping real -> real)

    # TODO: Dashboard can make a list widget for values or
    #       a transfer function editor (would be a nice generic widget!)


class ColorMap(Map):
    """Representation of a color lookup table."""
    # Abstract class, don't register, and don't set name


@register
class ArrayColorMap(ColorMap):
    """Representation of a color lookup table by an array of values."""
    _model_name = Unicode('ArrayColorMapModel').tag(sync=True)
    values = DataUnion(dtype=np.float32, shape_constraint=shape_constraints(None, 3)).tag(sync=True, **data_union_serialization)
    space = Enum(["rgb", "hsv"], "rgb").tag(sync=True)

    # TODO: Pair colors with domain values (Map is a mapping real -> color)

    # TODO: Do this instead?
    # values = List(CSSColor).tag(sync=True)
    # Then we can do:
    #   ArrayColorMap(values=["hsl(30,50%,50%)", "hsl(90,50%,50%)"], space="hsl")
    # Check out options for color interpolation spaces in d3.

    # TODO: Dashboard can make a list widget for values or
    #       a transfer function editor (would be a nice generic widget!)


@register
class NamedColorMap(ColorMap):
    """Representation of a color lookup table by name."""
    _model_name = Unicode('NamedColorMapModel').tag(sync=True)

    name = Enum(colormap_names, "viridis").tag(sync=True)

    def dashboard(self):
        "Create linked widgets for this data."
        children = []

        w = widgets.Dropdown(
            value=self.name,
            options=[(v.capitalize(), v) for v in colormap_names],
            description="Name")
        traitlets.link((w, "value"), (self, "name"))
        children.append(w)

        return widgets.VBox(children=children)


# ------------------------------------------------------


class ScalarValued(BaseWidget):
    """Representation of a scalar quantity."""
    # Abstract class, don't register, and don't set name
    pass


@register
class ScalarConstant(ScalarValued):
    """Representation of a scalar constant."""
    _model_name = Unicode('ScalarConstantModel').tag(sync=True)

    value = CFloat(0.0).tag(sync=True)

    def dashboard(self):
        "Create a linked slider for this scalar."
        children = []

        w = widgets.FloatSlider(value=self.value)
        widgets.jslink((w, "value"), (self, "value"))
        children.append(w)

        return widgets.VBox(children=children)


@register
class ScalarField(ScalarValued):
    """Representation of a scalar field."""
    _model_name = Unicode('ScalarFieldModel').tag(sync=True)

    field = Instance(Field, allow_none=False).tag(sync=True, **widget_serialization)
    lut = Instance(ScalarMap, allow_none=True).tag(sync=True, **widget_serialization)

    def dashboard(self):
        "Create linked widgets for this data."
        children, titles = _gather_dashboards(self, ["lut"])
        return widgets.VBox(children=children)


@register
class ScalarIndicators(ScalarValued):
    """Representation of a scalar constant for each mesh entity."""
    _model_name = Unicode('ScalarIndicatorsModel').tag(sync=True)

    # TODO: Validate field spaces: ["I2", "I3"]
    field = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization)
    lut = Instance(ScalarMap, allow_none=True).tag(sync=True, **widget_serialization)
    value = CInt(1).tag(sync=True)

    def dashboard(self):
        "Create linked widgets for this data."
        children, titles = _gather_dashboards(self, ["lut"])

        w = widgets.IntText(value=self.value, description="Value")
        widgets.jslink((w, "value"), (self, "value"))
        children.append(w)

        return widgets.VBox(children=children)


# ------------------------------------------------------


def CSSColor(default_value):
    """Create a color trait.

    Temporary workaround to allow both hsl(h,s,l) syntax
    and linking to the standard color picker widget.
    """
    return Union([Color(default_value), Unicode()])


class ColorValued(BaseWidget):
    """Representation of a color quantity."""
    # Abstract class, don't register, and don't set name
    pass


@register
class ColorConstant(ColorValued):  # TODO: Use something from ipywidgets or other generic library
    """Representation of a constant color."""
    _model_name = Unicode('ColorConstantModel').tag(sync=True)

    intensity = CFloat(1.0).tag(sync=True)  # TODO: Maybe just drop this
    color = CSSColor("#ffffff").tag(sync=True)

    def dashboard(self):
        "Create a linked color picker for this color."
        children = []

        w = widgets.FloatSlider(value=self.intensity, description="Intensity")
        widgets.jslink((w, "value"), (self, "intensity"))
        children.append(w)

        w = widgets.ColorPicker(value=self.color, description="Color")
        widgets.jslink((w, "value"), (self, "color"))
        children.append(w)

        return widgets.VBox(children=children)


@register
class ColorField(ColorValued):
    """Representation of a color field."""
    _model_name = Unicode('ColorFieldModel').tag(sync=True)

    field = Instance(Field, allow_none=False).tag(sync=True, **widget_serialization)
    lut = Instance(ColorMap, allow_none=True).tag(sync=True, **widget_serialization)

    def dashboard(self):
        "Create linked widgets for this data."
        children, titles = _gather_dashboards(self, ["lut"])

        return widgets.VBox(children=children)


@register
class ColorIndicators(ColorValued):
    """Representation of a color constant for each mesh entity."""
    _model_name = Unicode('ColorIndicatorsModel').tag(sync=True)

    # TODO: Validate field spaces: ["I2", "I3"]
    field = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization)
    lut = Instance(ColorMap, allow_none=True).tag(sync=True, **widget_serialization)

    def dashboard(self):
        "Create linked widgets for this data."
        children, titles = _gather_dashboards(self, ["lut"])

        return widgets.VBox(children=children)


# ------------------------------------------------------


@register
class WireframeParams(BaseWidget):
    """Collection of wireframe parameters."""
    _model_name = Unicode('WireframeParamsModel').tag(sync=True)
    enable = CBool(True).tag(sync=True)
    size = CFloat(0.01).tag(sync=True)  # TODO: Rename to width?
    color = CSSColor("#000000").tag(sync=True)
    opacity = CFloat(1.0).tag(sync=True)

    def dashboard(self):
        "Create linked widgets for wireframe parameters."
        children = []

        w = widgets.Checkbox(value=self.enable, description="Enable")
        widgets.jslink((w, "value"), (self, "enable"))
        children.append(w)

        w = widgets.FloatSlider(value=self.size, min=0.005, max=0.1, step=0.005, readout_format=".3f", description="Width")
        widgets.jslink((w, "value"), (self, "size"))
        children.append(w)

        w = widgets.ColorPicker(value=self.color, description="Color")
        widgets.jslink((w, "value"), (self, "color"))
        children.append(w)

        w = widgets.FloatSlider(value=self.opacity, min=0.0, max=1.0, step=0.01, description="Opacity")
        widgets.jslink((w, "value"), (self, "opacity"))
        children.append(w)

        return widgets.VBox(children=children)


@register
class IsovalueParams(BaseWidget):
    """Collection of isosurface value parameters."""
    _model_name = Unicode('IsovalueParamsModel').tag(sync=True)
    mode = Enum(isosurface_types, "single").tag(sync=True)
    value = CFloat(0.0).tag(sync=True)
    num_intervals = CFloat(0).tag(sync=True)
    spacing = CFloat(1.0).tag(sync=True)
    period = CFloat(3.0).tag(sync=True)

    def dashboard(self):
        "Create linked widgets for isosurface parameters."
        children = []

        w = widgets.Dropdown(
            value=self.mode,
            options=[(v.capitalize(), v) for v in isosurface_types],
            description="Mode")
        traitlets.link((w, "value"), (self, "mode"))
        children.append(w)

        w = widgets.FloatSlider(value=self.num_intervals, min=0.0, step=0.1, readout_format=".1f", description="Number of intervals")
        widgets.jslink((w, "value"), (self, "num_intervals"))
        children.append(w)

        w = widgets.FloatSlider(value=self.spacing, min=0.0, readout_format=".4e", description="Spacing")
        widgets.jslink((w, "value"), (self, "spacing"))
        children.append(w)

        w = widgets.FloatSlider(value=self.period, min=0.1, max=10.0, step=0.1, readout_format=".1f", description="Period")
        widgets.jslink((w, "value"), (self, "period"))
        children.append(w)

        return widgets.VBox(children=children)

# ------------------------------------------------------
