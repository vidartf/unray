
import numpy as np

import ipywidgets as widgets
from ipywidgets import widget_serialization

from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool
from traitlets import Instance, TraitError, TraitType, Undefined
from traittypes import Array

from .traits_numpy import array_serialization, shape_constraints
from ._version import widget_module_version 

module_name = 'unray'
module_version = widget_module_version


@widgets.register('unray.Data')
class Data(widgets.Widget):
    """"""
    _model_name = Unicode('DataModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    # Default unvalidated traitlet
    array = Array().tag(sync=True, **array_serialization)
    name = Unicode("unnamed").tag(sync=True)

    # TODO: Is there a way to let the instance of this object
    # validate the array with specific dtype/shape requirements?
    # This doesn't work because the traits are class members,
    # not instance members, so self.array doesn't do what we want:
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

    def _ipython_display_(self):
        return DataDisplay(data=self)


@widgets.register('unray.DataDisplay')
class DataDisplay(widgets.DOMWidget):
    """"""
    _view_name = Unicode('DataDisplayView').tag(sync=True)
    _model_name = Unicode('DataDisplayModel').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    data = Instance(Data, allow_none=True).tag(sync=True, **widget_serialization)


@widgets.register('unray.Plot')
class Plot(widgets.DOMWidget):
    """"""
    _view_name = Unicode('PlotView').tag(sync=True)
    _model_name = Unicode('PlotModel').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    name = Unicode("unnamed").tag(sync=True)
    method = Unicode("surface").tag(sync=True)
    encoding = Dict(value_trait=Dict(), default_value={}).tag(sync=True)


@widgets.register('unray.Figure')
class Figure(widgets.DOMWidget):
    """"""
    _view_name = Unicode('FigureView').tag(sync=True)
    _model_name = Unicode('FigureModel').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    width = CInt(800).tag(sync=True)
    height = CInt(600).tag(sync=True)
    downscale = CFloat(1.0).tag(sync=True)

    animate = CBool(False).tag(sync=True)

    data = Dict(Instance(Data), default_value={}, allow_none=False).tag(sync=True, **widget_serialization)
    plots = Dict(Instance(Plot), default_value={}, allow_none=False).tag(sync=True, **widget_serialization)

    plotname = Unicode().tag(sync=True)

    def update_data(self, **kwargs):
        d = dict(self.data)
        for key, value in kwargs.items():
            if not isinstance(value, Data):
                value = Data(name=key, array=value)
            d[key] = value
        self.data = d

    def update_plots(self, **kwargs):
        d = dict(self.plots)
        for key, value in kwargs.items():
            if not isinstance(value, Plot):
                raise ValueError("Expected Plot objects.")
            d[key] = value
        self.plots = d
