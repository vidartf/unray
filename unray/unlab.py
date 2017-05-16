
from unray.unray import Unray
UnrayFigure = Unray


def quicksplat(cells, coordinates,
               density, scale_density=1.0,
               width=400, height=500, downscale=1,
               **kwargs):
    """Visualize a function over a unstructured mesh using volume rendering.

    Using a simple splatting model:

        image intensity = integral of density along view ray

    :param cells: numpy array of vertex indices with shape [num_cells][4]
    :param coordinates: numpy array of vertex coordinates with shape [num_vertices][3]
    :param density: numpy array of density in each vertex with shape [num_vertices]
    :param scale_density: scalar to multiply density with

    :param width: width of rendering surface
    :param height: height of rendering surface
    :param downscale: downscale the rendering for better performance, for instance when set to 2, a 512x512 canvas will show a 256x256 rendering upscaled, but it will render twice as fast.

    :return:

    """

    fig = UnrayFigure(
        mark="splat",
        cells=cells, coordinates=coordinates,
        density=density, scale_density=scale_density,
        width=width, height=height, downscale=downscale,
        **kwargs)

    return fig


def quickmip(cells, coordinates,
             density, scale_density=1.0,
             width=400, height=500, downscale=1,
             **kwargs):
    """Visualize a function over a unstructured mesh using volume rendering.

    Using a simple maximum intensity projection model:

        image intensity = max of density along view ray

    :param cells: numpy array of vertex indices with shape [num_cells][4]
    :param coordinates: numpy array of vertex coordinates with shape [num_vertices][3]
    :param density: numpy array of density in each vertex with shape [num_vertices]
    :param scale_density: scalar to multiply density with

    :param width: width of rendering surface
    :param height: height of rendering surface
    :param downscale: downscale the rendering for better performance, for instance when set to 2, a 512x512 canvas will show a 256x256 rendering upscaled, but it will render twice as fast.

    :return:

    """

    fig = UnrayFigure(
        mark="mip",
        cells=cells, coordinates=coordinates,
        density=density, scale_density=scale_density,
        width=width, height=height, downscale=downscale,
        **kwargs)

    return fig
