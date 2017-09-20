#!/bin/bash
set -ex

pip install -r requirements.txt

mkdir deps
pushd deps

wget https://github.com/jovyan/pythreejs/archive/auto-gen-wrappers.zip
unzip auto-gen-wrappers.zip

pushd pythreejs
pip install .
popd

popd
