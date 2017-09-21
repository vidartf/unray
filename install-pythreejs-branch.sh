#!/bin/bash
set -ex

mkdir deps
pushd deps

# This doesn't work without npm:
# pip install https://github.com/jovyan/pythreejs/archive/auto-gen-wrappers.zip

wget https://github.com/jovyan/pythreejs/archive/auto-gen-wrappers.zip
unzip auto-gen-wrappers.zip

pushd pythreejs-auto-gen-wrappers
(cd js && npm install)
(cd js && npm run autogen)
(cd js && npm run build)
pip install -e .
jupyter nbextension install --py --sys-prefix pythreejs
jupyter nbextension enable --py --sys-prefix pythreejs
jupyter nbextension list
popd

popd

npm install ./deps/pythreejs-auto-gen-wrappers/js
