import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register
from ipydatawidgets import DataUnion, shape_constraints
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version


@register
class Mesh(widgets.Widget):
    """Representation of an unstructured mesh."""
    _model_name = Unicode('MeshModel').tag(sync=True)
    _model_module = Unicode(widget_module_name).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)
    auto_orient = CBool(True).tag(sync=True)
    cells = DataUnion(dtype=np.int32, shape_constraint=shape_constraints(None, 4)).tag(sync=True)
    points = DataUnion(dtype=np.float32, shape_constraint=shape_constraints(None, 3)).tag(sync=True)
