#!/bin/bash
set -ex
pip install -e .
jupyter nbextension install --py --sys-prefix unray
jupyter nbextension enable --py --sys-prefix unray
