var _ = require('underscore');

// Export widget models and views
module.exports = _.extend({},
    require('./data.js'),
    require('./datadisplay.js'),
    require('./plot.js'),
    require('./figure.js')
);
