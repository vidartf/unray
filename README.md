jupyter-unray
===============================

Volume Rendering for Unstructured Tetrahedral Meshes

Installation
------------

To install use pip:

    $ pip install ipyunray
    $ jupyter nbextension enable --py --sys-prefix ipyunray


For a development installation (requires npm),

    $ git clone https://github.com/martinal/jupyter-unray.git
    $ cd jupyter-unray
    $ pip install -e .
    $ jupyter nbextension install --py --symlink --sys-prefix ipyunray
    $ jupyter nbextension enable --py --sys-prefix ipyunray
