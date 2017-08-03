from unray._version import version_info, __version__

from unray.widgets import *
from unray.lab import *
from unray.examples import *


def _jupyter_nbextension_paths():
    return [{
        'section': 'notebook',
        'src': 'static',
        'dest': 'unray',
        'require': 'unray/extension'
    }]
