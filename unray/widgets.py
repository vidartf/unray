
import numpy as np

import ipywidgets as widgets
from ipywidgets import widget_serialization

from traitlets import Unicode, List, Dict, Any, CFloat, CInt, CBool
from traitlets import Instance, TraitError, TraitType, Undefined

from ipydatawidgets import DataUnion, data_union_serialization

from ._version import widget_module_version

module_name = 'unray'
module_version = widget_module_version


@widgets.register
class Data(widgets.Widget):
    """"""
    _model_name = Unicode('DataModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    # Default unvalidated traitlet
    array = DataUnion().tag(sync=True, **data_union_serialization)
    name = Unicode("unnamed").tag(sync=True)

    def _ipython_display_(self):
        return DataDisplay(data=self)


@widgets.register
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


@widgets.register
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
