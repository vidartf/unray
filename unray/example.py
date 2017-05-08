import ipywidgets as widgets
from traitlets import Unicode, Dict, Any
from .traits_numpy import array_serialization, shape_constraints
from traittypes import Array
import numpy as np

default_config = dict(
    raymodel="sum",
)

@widgets.register('unray.Unray')
class Unray(widgets.DOMWidget):
    """"""
    _view_name = Unicode('UnrayView').tag(sync=True)
    _model_name = Unicode('UnrayModel').tag(sync=True)
    _view_module = Unicode('jupyter-unray').tag(sync=True)
    _model_module = Unicode('jupyter-unray').tag(sync=True)
    _view_module_version = Unicode('^0.1.0').tag(sync=True)
    _model_module_version = Unicode('^0.1.0').tag(sync=True)

    config = Dict(default_config).tag(sync=True)

    cells = (
        Array(dtype='uint32', default_value=np.empty(shape=(0, 4), dtype='uint32'))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None, 4))
        )
    coordinates = (
        Array(dtype='float32')
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None, 3))
        )

    density_function_values = (
        Array(dtype='float32')
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None,))
        )
    color_function_values = (
        Array(dtype='float32')
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None,))
        )

    density_lut = (
        Array(dtype='float32')
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None,))
        )
    color_lut = (
        Array(dtype='float32')
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None, 3))
        )

    mvp = (
        Array(dtype='float32')
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(4, 4))
        )
    viewDirection = (
        Array(dtype='float32')
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(3,))
        )

    # TODO: Consider vega-like format, splitting data and encoding:
    '''
    # Let data be a dict of arrays
    data = Dict(
        key_trait=Unicode(),
        value_trait=Array().tag(**array_serialization)
    ).tag(sync=True)

    mark = Unicode()

    # Encoding should not contain any large arrays
    encoding = Dict(
        key_trait=Unicode(),
        value_trait=Any()
    ).tag(sync=True)
    '''
