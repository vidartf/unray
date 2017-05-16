import ipywidgets as widgets
from ipywidgets import widget_serialization
from traitlets import Unicode, Dict, Any, CFloat, CInt, CBool
from traitlets import Instance, TraitError, TraitType, Undefined
from .traits_numpy import array_serialization, shape_constraints
from traittypes import Array
import numpy as np


module_name = 'jupyter-unray'
module_version = '^0.1.0'


@widgets.register('unray.Data')
class Data(widgets.Widget):
    """"""
    _view_name = Unicode('DataView').tag(sync=True)
    _model_name = Unicode('DataModel').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    '''
    def __init__(self, *args, **kwargs):
        if len(args) > 1:
            raise ValueError("Expected at most one positional argument.")

        # Get user validation parameters
        shape = kwargs.pop("shape", None)
        dtype = kwargs.pop("dtype", None)
        default = kwargs.pop("default", Undefined)

        # This makes life simpler
        allow_none = False

        # Override class traitlet with customized version with validation
        if ( (default is not Undefined) or (allow_none is True)
                or (dtype is not None) or (shape is not None)):
            self.array = Array(default_value=default,
                               allow_none=allow_none,
                               dtype=dtype).tag(sync=True, **array_serialization)
            if shape is not None:
                nshape = tuple(d or None for d in shape)
                self.array = self.array.valid(shape_constraints(*nshape))

        # Pass on given value as kwarg to widget
        if args:
            kwargs["array"] = args[0]

        # Now move on to widget initialization
        widgets.Widget.__init__(self, **kwargs)
    '''

    # Default unvalidated traitlet
    array = Array().tag(sync=True, **array_serialization)


@widgets.register('unray.DataDisplay')
class DataDisplay(widgets.Widget):
    """"""
    _view_name = Unicode('DataDisplayView').tag(sync=True)
    _model_name = Unicode('DataDisplayModel').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    data = Instance(Data, allow_none=True).tag(sync=True, **widget_serialization)
