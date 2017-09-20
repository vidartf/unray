# unray

[![Build Status](https://travis-ci.org/martinal/unray.svg?branch=master)](https://travis-ci.org/martinal/unray)

## Description

Unray is a scientific visualization package
for scalar data on unstructured tetrahedral meshes.

Rendering is based on WebGL and Three.js,
and the user interface is based on ipywidgets,
intended to be used as a widget in a Jupyter Notebook.


## Features

Features currently include:

  * Order independent volume rendering modes:

    + Xray (pure absorption)

    + Sum (pure emission)

    + Maximum projection

    + Minimum projection

  * Isosurface rendering:

    + Single surface

    + Linearly spaced surfaces

    + Log spaced surfaces

  * Opaque surface rendering of selected cells with optional wireframe


To extend this to full volume rendering with an emission-absorption model,
a cell sorting algorithm must be implementated in javascript or webassembly.


## Installation

To install use pip:

    pip install unray
    jupyter nbextension enable --py --sys-prefix unray


For a development installation (requires npm),

    git clone https://github.com/martinal/unray.git
    cd unray
    pip install -e .
    jupyter nbextension install --py --symlink --sys-prefix unray
    jupyter nbextension enable --py --sys-prefix unray

