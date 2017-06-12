# TODO: Currently unused, pick pieces here as needed and remove

import ipywidgets as widgets
from traitlets import Unicode, Dict, Any, CFloat, CInt, CBool
from .traits_numpy import array_serialization, shape_constraints
from traittypes import Array
import numpy as np

default_config = dict(
    raymodel="sum",
)

default_density_lut = np.linspace(0.0, 1.0, 256, dtype='float32')

default_emission_lut = np.outer(
    np.linspace(0.0, 1.0, 256, dtype='float32'),
    np.ones(3, dtype="float32")
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

    width = CInt(800).tag(sync=True)
    height = CInt(600).tag(sync=True)
    downscale = CInt(1).tag(sync=True)

    ready = CBool(False).tag(sync=True)

    config = Dict(default_config).tag(sync=True)

    cells = (
        Array(dtype='uint32', default_value=np.zeros(shape=(0, 4), dtype='uint32'))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None, 4))
        )
    ordering = (
        Array(dtype='uint32', default_value=np.zeros(shape=(0,), dtype='uint32'))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None,))
        )

    coordinates = (
        Array(dtype='float32', default_value=np.zeros(shape=(0, 3), dtype='float32'))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None, 3))
        )

    density = (
        Array(dtype='float32', default_value=np.zeros(shape=(0,), dtype='float32'))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None,))
        )
    emission = (
        Array(dtype='float32', default_value=np.zeros(shape=(0,), dtype='float32'))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None,))
        )

    # TODO: use array instead
    density_min = CFloat(0.0).tag(sync=True)
    density_max = CFloat(1.0).tag(sync=True)
    emission_min = CFloat(0.0).tag(sync=True)
    emission_max = CFloat(1.0).tag(sync=True)

    density_lut = (
        Array(dtype='float32', default_value=default_density_lut)
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None,))
        )
    emission_lut = (
        Array(dtype='float32', default_value=default_emission_lut)
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(None, 3))
        )

    mvp = (
        Array(dtype='float32', default_value=np.eye(4, dtype='float32'))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(4, 4))
        )
    view_direction = (
        Array(dtype='float32', default_value=np.asarray([0.0, 0.0, 1.0], dtype='float32'))
        .tag(sync=True, **array_serialization)
        .valid(shape_constraints(3,))
        )

    def show(self):
        self.send({"action": "show"})

    def set_data(self, name, array):
        "Send array with a custom message instead of via traitlets. Not sure if we'll need this."
        content = {
            "action": "set_data",
            "name": name,
            "dtype": array.dtype.name,
            "shape": array.shape,
        }
        return self.send(content, [array])
