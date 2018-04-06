
.. _installation:

Installation
============


The simplest way to install unray is via pip::

    pip install unray

or via conda::

    conda install unray


If you installed via pip, and notebook version < 5.3, you will also have to
install / configure the front-end extension as well. If you are using classic
notebook (as opposed to Jupyterlab), run::

    jupyter nbextension install [--sys-prefix / --user / --system] --py unray

    jupyter nbextension enable [--sys-prefix / --user / --system] --py unray

with the `appropriate flag`_. If you are using Jupyterlab, install the extension
with::

    jupyter labextension install unray


.. links

.. _`appropriate flag`: https://jupyter-notebook.readthedocs.io/en/stable/extending/frontend_extensions.html#installing-and-enabling-extensions
