from dolfin import *
import sys
import numpy as np
filename = sys.argv[1]
mesh = Mesh(filename)
cells = mesh.cells()
coordinates = mesh.coordinates()
npname = filename.replace(".xml.gz", ".npz")
np.savez_compressed(npname, cells=cells, points=coordinates)

# Load like this:
#obj = np.load(npname)
#cells = obj["cells"]
#points = obj["points"]
