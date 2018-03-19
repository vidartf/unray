#!/usr/bin/env python
# coding: utf-8

from __future__ import print_function

import os

from setuptools import setup, find_packages
from distutils import log

from setupbase import (
    create_cmdclass, install_npm, ensure_targets, combine_commands,
    ensure_python, get_version, HERE
)

pjoin = os.path.join

log.set_verbosity(log.DEBUG)
log.info('setup.py entered')
log.info('$PATH=%s' % os.environ['PATH'])

ensure_python('>=3.3')

name = 'unray'
LONG_DESCRIPTION = 'Volume Rendering for Unstructured Tetrahedral Meshes'


targets = [
    pjoin(HERE, name, 'static', 'extension.js'),
    pjoin(HERE, name, 'static', 'index.js')
]

version = get_version(pjoin(name, '_version.py'))


package_data_spec = {
    name: [
        'unray/static/*.*js*',
        'labextension/*.tgz'
    ]
}

data_files_spec = [
    ('share/jupyter/nbextensions/' + name,
     pjoin(name, 'static'),
     '*.js*'
    ),
    #('share/jupyter/lab/extensions', lab_path, '*.tgz'),
    ('etc/jupyter', pjoin(HERE, 'jupyter-config'), '**/*.json')
]

cmdclass = create_cmdclass(
    'js',
    package_data_spec=package_data_spec,
    data_files_spec=data_files_spec
)
cmdclass['js'] = combine_commands(
    install_npm(
        path=pjoin(HERE, 'js'),
        build_cmd='build:all',
        build_dir=pjoin(HERE, name, 'static'),
        source_dir=pjoin(HERE, 'js'),
    ),
    ensure_targets(targets),
)

setup_args = {
    'name': name,
    'version': version,
    'description': 'Volume Rendering for Unstructured Tetrahedral Meshes',
    'long_description': LONG_DESCRIPTION,
    'include_package_data': True,
    'install_requires': [
        'ipywidgets>=7.0.1',
        'ipydatawidgets>=3.0.0',
        'pythreejs>=1.0.0',
        'numpy',
    ],
    'packages': find_packages(),
    'zip_safe': False,
    'cmdclass': cmdclass,

    'author': 'Martin Sandve Alnæs',
    'author_email': 'martinal@simula.no',
    'maintainer': 'Vidar Tonaas Fauske',
    'maintainer_email': 'vidartf@gmail.com',
    'url': 'http://github.com/martinal/unray',
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
