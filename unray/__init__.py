from unray._version import version_info, __version__

from unray.datawidgets import *
from unray.plotwidgets import *

def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'unray',
        'require': 'unray/extension'
    }]
