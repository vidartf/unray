import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register
from ipydatawidgets import NDArrayWidget
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version

from .datawidgets import Mesh


@register
class Plot(widgets.Widget):
    """TODO: Document me."""
    _model_name = Unicode('Plot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)


@register
class WireframePlot(Plot):
    """TODO: Document me."""
    _model_name = Unicode('WireframePlot').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    mesh = Instance(Mesh, allow_none=False).tag(sync=True, **widget_serialization)
    #restrict = Instance(IndicatorField, allow_none=False).tag(sync=True, **widget_serialization) # TODO: Validate field spaces: ["I3", "I2"]
    wireframe = CBool(True).tag(sync=True)
    edgesize = CFloat(0.001).tag(sync=True)
    # TODO
