'use strict';

// TODO: Add classes mirroring plotwidgets.py here

// TODO: Remove data.js, figure.js, plot.js once replacements are up


import widgets from '@jupyter-widgets/base';
//import _ from 'underscore';

import version from './version';

// Create model class based on this data flow:
//    end-user updates data on python widget
// -> widgets subsystems do their magic
// -> model.on_change() is called
// -> model.state.update()  // this can be piecewise in a promise chain
// -> model.state.subscene.update()  // this must be a self consistent scene update
// -> somehow(tm) trigger refresh so renderer redraws stuff
//    (to avoid multiple refreshes in complex scenarios,
//     consider a "with renderer.hold_render()" pattern?)

class PlotModel extends widgets.DOMWidgetModel {  // FIXME: Extend Blackbox here
    defaults() {
        return Object.assign(super.defaults(), version.module_defaults);
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);

        // Get any change events
        this.on('change', this.onChange, this);

        // Initialize subclass plot state, this.obj is the root created by pythreejs blackbox
        this.plotstate = this.createInitialPlotState(this.obj, attributes);
    }

    onChange(model, options) {
        this.log("onChange", model, options);

        // Let backbone tell us which attributes have changed
        const changed = model.changedAttributes();

        // Pass on to plotstate
        this.plotstate.update(changed);

        // Trigger new rendering in pythreejs
        this.trigger('rerender', this, {});
    }

    log() {
        console.log(...arguments);
    }
};


class WireframePlotModel extends PlotModel {
    defaults() {
        return Object.assign(super.defaults(), {
            _model_name : 'WireframePlotModel',
            _view_name : 'WireframePlotView',
            mesh: null,
            //restrict: null,
            wireframe: true,
            edgesize: 0.001,
        });
    }

    initialize(attributes, options) {
        super.initialize(attributes, options);
    }

    createInitialPlotState(root, attributes) {
        this.log("createInitialPlotState", root, attributes);

        const initial = {
            // fixme: fill in from attributes
        };
        const initialized = 'hello world';// FIXME
        return {initialized, root, attributes};// FIXME
        //return create_unray_state(root, initial);
    }
};


export {
    WireframePlotModel,
};
