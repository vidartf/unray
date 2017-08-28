# TODO: Currently unused, pick pieces here as needed and remove

import ipywidgets as widgets
from traitlets import Unicode, Dict, Any, CFloat, CInt, CBool
from ipydatawidgets import DataUnion, data_union_serialization, shape_constraints
import numpy as np
from ._version import widget_module_version

default_config = dict(
    raymodel="sum",
)

default_density_lut = np.linspace(0.0, 1.0, 256, dtype='float32')

default_emission_lut = np.outer(
    np.linspace(0.0, 1.0, 256, dtype='float32'),
    np.ones(3, dtype="float32")
    )


@widgets.register
class Unray(widgets.DOMWidget):
    """"""
    _view_name = Unicode('UnrayView').tag(sync=True)
    _model_name = Unicode('UnrayModel').tag(sync=True)
    _view_module = Unicode('unray').tag(sync=True)
    _model_module = Unicode('unray').tag(sync=True)
    _view_module_version = Unicode(widget_module_version).tag(sync=True)
    _model_module_version = Unicode(widget_module_version).tag(sync=True)

    width = CInt(800).tag(sync=True)
    height = CInt(600).tag(sync=True)
    downscale = CInt(1).tag(sync=True)

    ready = CBool(False).tag(sync=True)

    config = Dict(default_config).tag(sync=True)

    cells = (
        DataUnion(dtype='uint32', shape_constraint=shape_constraints(None, 4),
                  default_value=np.zeros(shape=(0, 4), dtype='uint32'))
        .tag(sync=True, **data_union_serialization)
        )
    ordering = (
        DataUnion(dtype='uint32', shape_constraint=shape_constraints(None,),
                  default_value=np.zeros(shape=(0,), dtype='uint32'))
        .tag(sync=True, **data_union_serialization)
        )

    coordinates = (
        DataUnion(dtype='float32', shape_constraint=shape_constraints(None, 3),
                  default_value=np.zeros(shape=(0, 3), dtype='float32'))
        .tag(sync=True, **data_union_serialization)
        )

    density = (
        DataUnion(dtype='float32', shape_constraint=shape_constraints(None,),
                  default_value=np.zeros(shape=(0,), dtype='float32'))
        .tag(sync=True, **data_union_serialization)
        )
    emission = (
        DataUnion(dtype='float32', shape_constraint=shape_constraints(None,),
                  default_value=np.zeros(shape=(0,), dtype='float32'))
        .tag(sync=True, **data_union_serialization)
        )

    # TODO: use array instead
    density_min = CFloat(0.0).tag(sync=True)
    density_max = CFloat(1.0).tag(sync=True)
    emission_min = CFloat(0.0).tag(sync=True)
    emission_max = CFloat(1.0).tag(sync=True)

    density_lut = (
        DataUnion(dtype='float32', shape_constraint=shape_constraints(None,),
                  default_value=default_density_lut)
        .tag(sync=True, **data_union_serialization)
        )
    emission_lut = (
        DataUnion(dtype='float32', shape_constraint=shape_constraints(None, 3),
                  default_value=default_emission_lut)
        .tag(sync=True, **data_union_serialization)
        )

    mvp = (
        DataUnion(dtype='float32', shape_constraint=shape_constraints(4, 4),
                  default_value=np.eye(4, dtype='float32'))
        .tag(sync=True, **data_union_serialization)
        )
    view_direction = (
        DataUnion(dtype='float32', shape_constraint=shape_constraints(3,),
                  default_value=np.asarray([0.0, 0.0, 1.0], dtype='float32'))
        .tag(sync=True, **data_union_serialization)
        )

    def show(self):
        self.send({"action": "show"})
