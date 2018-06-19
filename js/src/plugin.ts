// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application, IPlugin
} from '@phosphor/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  IJupyterWidgetRegistry, WidgetModel
 } from '@jupyter-widgets/base';

import * as datawidgets from './datawidgets';

import * as plotwidgets from './plotwidgets';

import {
  EXTENSION_SPEC_VERSION
} from './version';

const EXTENSION_ID = 'jupyter.extensions.unray';


/**
 * The unray lab plugin.
 */
const unrayPlugin: IPlugin<Application<Widget>, void> = {
  id: EXTENSION_ID,
  requires: [IJupyterWidgetRegistry],
  activate: activateWidgetExtension,
  autoStart: true
};

export default unrayPlugin;


const widget_exports: {[key: string]: typeof WidgetModel} = {};
console.log(WidgetModel, datawidgets, plotwidgets);
for (let source of [datawidgets, plotwidgets]) {
  for (let key of Object.keys(source)) {
    let v = (source as any)[key];
    console.log(key, v.prototype instanceof WidgetModel);
    if (v.prototype instanceof WidgetModel) {
      widget_exports[key] = v;
    }
  }
}


/**
 * Activate the widget extension.
 */
function activateWidgetExtension(app: Application<Widget>, registry: IJupyterWidgetRegistry): void {
  registry.registerWidget({
    name: 'unray',
    version: EXTENSION_SPEC_VERSION,
    exports: widget_exports,
  });
}
