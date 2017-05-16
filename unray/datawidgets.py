import ipywidgets as widgets
from ipywidgets import widget_serialization
from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool
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


@widgets.register('unray.Plot')
class Plot(widgets.Widget):
    """"""
    _view_name = Unicode('PlotView').tag(sync=True)
    _model_name = Unicode('PlotModel').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    method = Unicode("blank").tag(sync=True)
    encoding = Dict(value_trait=Dict(), default_value={}).tag(sync=True)


@widgets.register('unray.Figure')
class Figure(widgets.Widget):
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

    data = Dict(value_trait=Instance(Data).tag(sync=True, **widget_serialization),
                default_value={})
    plot = Instance(Plot).tag(sync=True, **widget_serialization)


def render(coordinates, cells,
           density=None, emission=None,
           density_range=None, emission_range=None,
           method="blank"):
    # Always add mesh to data
    data = {}
    data["coordinates"] = Data(name="coordinates", array=coordinates)
    data["cells"] = Data(name="cells", array=cells)

    # Always add mesh to encoding
    encoding = {}
    encoding["coordinates"] = {"field": "coordinates"}
    encoding["cells"] = {"field": "cells"}

    # Optionally add density
    if density is not None:
        data["density"] = Data(name="density", array=density)
        if density_range is None:
            density_range = [np.min(density), np.max(density)]
        encoding["density"] = {"field": "density", "range": density_range}

    # Optionally add emission
    if emission is not None:
        data["emission"] = Data(name="emission", array=emission)
        if emission_range is None:
            emission_range = [np.min(emission), np.max(emission)]
        encoding["emission"] = {"field": "emission", "range": emission_range}

    # Setup plot
    plot = Plot(method=method, encoding=encoding)

    # Setup figure connecting all of it
    fig = Figure(data=data, plot=plot)
    return fig
