from unray._version import version_info, __version__

from unray.unray import *
from unray.unlab import *
from unray.examples import *
from unray.datawidgets import *

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'jupyter-unray',
        'require': 'jupyter-unray/extension'
    }]
