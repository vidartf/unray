#!/bin/bash
pip install nodeenv
nodeenv -p

echo
echo Which tools:
which pip
which python
which npm
which node
echo

pip install pytest

#pip install -r requirements.txt
pip install numpy ipywidgets ipydatawidgets
