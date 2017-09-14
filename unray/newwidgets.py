# def as_array_widget(values):
#     if values is None:
#         return None
#     if isinstance(values, NDArrayWidget):
#         return values
#     return NDArrayWidget(values)


def surf(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ArrayColorLUT(values=[[0,0,0], [1,1,1]])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict, wireframe=False)
    return SurfacePlot(**kwargs)


def wireframe(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ArrayColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict, wireframe=True)
    return SurfacePlot(**kwargs)


def xray(field, restrict=None):
    "TODO: Design and document."
    kwargs = dict(density=field, restrict=restrict)
    return XrayPlot(**kwargs)


def minproj(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ArrayColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return MinProjPlot(**kwargs)


def maxproj(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ArrayColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return MaxProjPlot(**kwargs)


def sumproj(field, lut=None, restrict=None):
    "TODO: Design and document."
    if lut is None:
        lut = ColorLUTArrayColorLUTT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(color=color, restrict=restrict)
    return SumProjPlot(**kwargs)


def volume(field, restrict=None):
    "TODO: Design and document."
    lut0 = ScalarLut(values=[0,0,0, 1,1,1])
    density = ScalarField(field=field, lut=lut0)
    lut1 = ArrayColorLUT(values=[0,0,0, 1,1,1])
    color = ColorField(field=field, lut=lut)
    kwargs = dict(density=density, color=color, restrict=restrict)
    return VolumePlot(**kwargs)
