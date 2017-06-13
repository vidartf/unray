#!/usr/bin/env python
# coding: utf-8

from __future__ import print_function

import os

from setuptools import setup, find_packages
from distutils import log

from setupbase import (
    create_cmdclass, install_npm, ensure_targets, combine_commands)

log.set_verbosity(log.DEBUG)
log.info('setup.py entered')
log.info('$PATH=%s' % os.environ['PATH'])

LONG_DESCRIPTION = 'Volume Rendering for Unstructured Tetrahedral Meshes'

here = os.path.dirname(os.path.abspath(__file__))


targets = [
    os.path.join(here, 'unray', 'static', 'extension.js'),
    os.path.join(here, 'unray', 'static', 'index.js')
]

version_ns = {}
with open(os.path.join(here, 'unray', '_version.py')) as f:
    exec(f.read(), {}, version_ns)

cmdclass = create_cmdclass(['js'])
cmdclass['js'] = combine_commands(
    install_npm(
        path=os.path.join(here, 'js'),
        build_dir=os.path.join(here, 'unray', 'static'),
        source_dir=os.path.join(here, 'js'),
    ),
    ensure_targets(targets),
)

setup_args = {
    'name': 'unray',
    'version': version_ns['__version__'],
    'description': 'Volume Rendering for Unstructured Tetrahedral Meshes',
    'long_description': LONG_DESCRIPTION,
    'include_package_data': True,
    'data_files': [
        ('share/jupyter/nbextensions/jupyter-unray', [
            'unray/static/extension.js',
            'unray/static/index.js',
            'unray/static/index.js.map',
        ]),
    ],
    'install_requires': [
        'ipywidgets>=7.0.0a4',
        'traittypes',
        'numpy',
    ],
    'packages': find_packages(),
    'zip_safe': False,
    'cmdclass': cmdclass,

    'author': 'Martin Sandve Alnæs',
    'author_email': 'martinal@simula.no',
    'url': 'http://jupyter.org',
    'keywords': [
        'ipython',
        'jupyter',
        'widgets',
    ],
    'classifiers': [
        'Development Status :: 4 - Beta',
        'Framework :: IPython',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'Topic :: Multimedia :: Graphics',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
    ],
}

setup(**setup_args)
