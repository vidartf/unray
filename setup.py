#!/usr/bin/env python
# coding: utf-8

from __future__ import print_function
from glob import glob
from os.path import join as pjoin

from setuptools import setup, find_packages
from distutils import log

from setupbase import (
    create_cmdclass, install_npm, ensure_targets,
    combine_commands, ensure_python, get_version, HERE
)


# Ensure a valid python version
ensure_python('>=3.3')

name = 'unray'
LONG_DESCRIPTION = 'Volume Rendering for Unstructured Tetrahedral Meshes'


# Get our version
version = get_version(pjoin(name, '_version.py'))

nb_path = pjoin(HERE, name, 'static')

# Representative files that should exist after a successful build
targets = [
    pjoin(nb_path, 'index.js'),
    pjoin(nb_path, 'extension.js'),
    pjoin(HERE, 'js', 'dist', 'labext.js'),
]

package_data_spec = {
    name: [
        'static/*.*js*',
    ]
}

data_files_spec = [
    ('share/jupyter/nbextensions/' + name,
      nb_path,
      '*.js*'),
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
        build_dir=nb_path,
        source_dir=pjoin(HERE, 'js'),
    ),
    ensure_targets(targets),
)


setup_args = {
    'name': name,
    'version': version,
    'description': 'Jupyter Widget for Volume Rendering of Unstructured Tetrahedral Mesh Data',
    'long_description': LONG_DESCRIPTION,
    'include_package_data': True,
    'packages': find_packages(),
    'zip_safe': False,
    'scripts': glob(pjoin('scripts', '*')),
    'cmdclass': cmdclass,
    'author': 'Martin Sandve Alnæs',
    'author_email': 'martinal@simula.no',
    'maintainer': 'Vidar Tonaas Fauske',
    'maintainer_email': 'vidartf@gmail.com',
    'url': 'https://github.com/martinal/unray',
    'keywords': [
        'ipython',
        'jupyter',
        'widgets',
    ],
    'license': 'BSD',
    'platforms': "Linux, Mac OS X, Windows",
    'classifiers': [
        'Development Status :: 4 - Beta',
        'Framework :: Jupyter',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: BSD License',
        'Topic :: Multimedia :: Graphics',
        'Programming Language :: Python',
        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
    ],
    'install_requires': [
        'ipywidgets>=7.0.1',
        'ipydatawidgets>=3.0.0',
        'pythreejs>=1.0.0',
        'numpy',
    ],
    'extras_require': {
        'test': [
            'pytest',
            'pytest-cov',
            'nbval',
        ],
        'examples': [
            # Any requirements for the examples to run
        ],
        'docs': [
            'sphinx>=1.5',
            'recommonmark',
            'sphinx_rtd_theme',
            'nbsphinx>=0.2.13',
            'jupyter_sphinx',
            'nbsphinx-link',
            'pytest_check_links',
            'pypandoc',
        ],
    },
    'entry_points': {
    },
}

if __name__ == '__main__':
    setup(**setup_args)
