import chai from 'chai';
chai.config.includeStack = true;
chai.config.truncateThreshold = 80; // 0 = disable truncating, default = 40

import './test_meshutils';
import './test_object_manager';
import './test_channels';
import './test_datawidgets';
import './test_plotwidgets';
