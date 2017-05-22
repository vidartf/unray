import numpy as np
from unray.widgets import Data, Plot, Figure


default_density_lut = np.linspace(0.0, 1.0, 256, dtype='float32')


default_emission_lut = np.outer(
    np.linspace(0.0, 1.0, 256, dtype='float32'),
    np.ones(3, dtype="float32")
    )


def render(coordinates, cells,
           density=None, emission=None,
           density_range=None, emission_range=None,
           density_lut=None, emission_lut=None,
           method="blank",
           width=800, height=600, downscale=1.0):
    """Visualize a function over a unstructured tetrahedral mesh using volume rendering.

    Methods include: (work in progress, these are currently mostly ideas!)

      - blank: blank screen, used for debugging

      - surface: opaque surface of geometry

      - mip: maximum intensity projection

      - splat: emissive cloud without absorption

      - volume: absorption-emission model

    :param cells: numpy array of vertex indices with shape [num_cells][4]
    :param coordinates: numpy array of vertex coordinates with shape [num_vertices][3]

    :param density: numpy array of absorption density in each vertex with shape [num_vertices]
    :param density_range: (min, max) value of density

    :param emission: numpy array of emission intensity in each vertex with shape [num_vertices]
    :param emission_range: (min, max) value of emission

    :param width: width of rendering surface
    :param height: height of rendering surface
    :param downscale: downscale the rendering for better performance, for instance when set to 2, a 512x512 canvas will show a 256x256 rendering upscaled, but it will render twice as fast.

    :return: a widget to display in a notebook
    """    # Always add mesh to data
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
        if density_lut is None:
            pass # density_lut = default_density_lut # FIXME use
        if density_range is None:
            density_range = [np.min(density), np.max(density)]
        encoding["density"] = {"field": "density", "range": density_range}

    # Optionally add emission
    if emission is not None:
        data["emission"] = Data(name="emission", array=emission)
        if emission_lut is None:
            pass # emission_lut = default_emission_lut # FIXME use
        if emission_range is None:
            emission_range = [np.min(emission), np.max(emission)]
        encoding["emission"] = {"field": "emission", "range": emission_range}

    # Setup plot
    plotname = "plot_%s" % method
    plot = Plot(name=plotname, method=method, encoding=encoding)
    plots = {plotname: plot}

    # Setup figure connecting all of it
    fig = Figure()
    with fig.hold_sync():
        fig.width = width
        fig.height = height
        fig.downscale = downscale
        fig.data = data
        fig.plots = plots
    return fig
