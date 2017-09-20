#!/bin/bash
set -ex

pip install -r requirements.txt
pip install pytest

#mkdir deps
#pushd deps

#wget https://github.com/jovyan/pythreejs/archive/auto-gen-wrappers.zip
#unzip auto-gen-wrappers.zip

#pushd pythreejs-auto-gen-wrappers
#pip install .
#python -c "import pythreejs; print(pythreejs.__file__)"
#jupyter nbextension install --py --sys-prefix pythreejs
#jupyter nbextension enable --py --sys-prefix pythreejs
#jupyter nbextension list
#popd

#popd
