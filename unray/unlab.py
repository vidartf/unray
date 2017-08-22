"""
See newwidgets.py for implementation plan. Add completed classes to all here.
Later get rid of old classes Data, Figure, Plot, and move this to unray.* namespace.
"""

import numpy as np
import ipywidgets as widgets
from ipywidgets import widget_serialization, register
from ipydatawidgets import NDArrayWidget
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool, Enum
from traitlets import Instance, TraitError, TraitType, Undefined
from ._version import widget_module_name, widget_module_version

from .datawidgets import *
from .plotwidgets import *

__all__ = [
    "Mesh",
    "WireframePlot",
    ]
