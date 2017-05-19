var widgets = require('jupyter-js-widgets');
var _ = require('underscore');

var utils = require('./utils.js');


class DataDisplayModel extends widgets.DOMWidgetModel
{
    defaults()
    {
        let model_defaults = {
            _model_name : 'DataDisplayModel',
            _view_name : 'DataDisplayView',
            data : null,
        };
        return _.extend(super.defaults(), utils.module_defaults, model_defaults);
    }
};
DataDisplayModel.serializers = _.extend({
    data: { deserialize: widgets.unpack_models },
}, widgets.DOMWidgetModel.serializers);


class DataDisplayView extends widgets.DOMWidgetView
{
    initialize()
    {
        console.log("DATADISPLAYVIEW INIT", arguments)
        super.initialize(...arguments);
        this.dataview = null;
    }

    wire_events()
    {
        // datamodel change -> dataview.update
        //let data = this.model.get("data");
        // datadisplaymodel change -> datadisplaymodel.update
    }

    render()
    {
        console.log("DATADISPLAYVIEW RENDER", arguments)

        let data = this.model.get("data");
        if (data === undefined || data === null) {
            this.el.innerHTML = "<p>No data, couldn't create data display view.</p>";
            return Promise.resolve();
        }

        this.div = document.createElement("div");
        this.el.className = "jupyter-widget jupyter-unray";
        this.el.innerHTML = "";
        this.el.appendChild(this.div);

        let that = this;
        let view_promises = [];

        let p = this.create_child_view(data);

        view_promises.push(
            p.then((dataview) => { that.dataview = dataview; })
        );

        this.view_promises = Promise.all(view_promises)
            .then(() => { that.refresh(); })
            .catch((err) => { console.error(err); throw err; });

        return this.view_promises;
    }

    update()
    {
        console.log("DATADISPLAYVIEW UPDATE", arguments)
        super.update(...arguments);
        this.refresh();
    }

    refresh() {
        console.log("DATADISPLAYVIEW REFRESH", arguments)
        let dataview = this.dataview;
        let datamodel = dataview.model;
        let array = datamodel.get("array");
        this.div.innerHTML = "";
        this.div.textContent = array;
    }
};


module.exports = {
    DataDisplayModel, DataDisplayView
};
