import numpy as np
from unray.unlab import quicksplat, quickmip


def single_tetrahedron():
    cells = np.zeros((1, 4), dtype="uint32")
    coordinates = np.zeros((4, 3), dtype="float32")
    cells[0, :] = [0, 1, 2, 3]
    coordinates[0, :] = [0, 0, 0]
    coordinates[1, :] = [1, 0, 0]
    coordinates[2, :] = [0, 1, 0]
    coordinates[3, :] = [0, 0, 1]
    return cells, coordinates


def example_splat_tetrahedron():
    cells, coordinates = single_tetrahedron()
    density = (2.0**0.5) * np.ones(coordinates.shape[0], dtype="float32")
    return quicksplat(cells, coordinates, density)


def example_mip_tetrahedron():
    cells, coordinates = single_tetrahedron()
    density = (2.0**0.5) * np.ones(coordinates.shape[0], dtype="float32")
    return quickmip(cells, coordinates, density)
