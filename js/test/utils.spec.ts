"use strict";

import expect = require('expect.js');

import * as widgets from '@jupyter-widgets/base';
import * as services from '@jupyterlab/services';
import * as Backbone from 'backbone';

const expectAllCloseTo = (actual: number[], expected: number[], delta=1e-8) => {
  for (let i in actual) {
    expect(actual[i]).within(expected[i] - delta, expected[i] + delta);
  }
};

export { expectAllCloseTo };


/**
 * Serial ID for mock comms:
 */
let numComms = 0;

export
class MockComm {
    constructor() {
        this.comm_id = `mock-comm-id-${numComms}`;
        numComms += 1;
        this._on_msg = null;
        this._on_close = null;
    }
    on_close(fn: Function | null) {
        this._on_close = fn;
    }
    on_msg(fn: Function | null) {
        this._on_msg = fn;
    }
    _process_msg(msg: services.KernelMessage.ICommMsg) {
        if (this._on_msg) {
            return this._on_msg(msg);
        } else {
            return Promise.resolve();
        }
    }
    close() {
        if (this._on_close) {
            this._on_close();
        }
    }
    send() {}

    comm_id: string;
    _on_msg: Function | null = null;
    _on_close: Function | null = null;
}

export
class DummyManager extends widgets.ManagerBase<HTMLElement> {
    constructor() {
        super();
        this.el = window.document.createElement('div');
    }

    display_view(msg: services.KernelMessage.IMessage, view: Backbone.View<Backbone.Model>, options: any) {
        // TODO: make this a spy
        // TODO: return an html element
        return Promise.resolve(view).then(view => {
            this.el.appendChild(view.el);
            view.on('remove', () => console.log('view removed', view));
            return view.el;
        });
    }

    loadClass(className: string, moduleName: string, moduleVersion: string): Promise<any> {
        if (moduleName === '@jupyter-widgets/base') {
            if ((widgets as any)[className]) {
                return Promise.resolve((widgets as any)[className]);
            } else {
                return Promise.reject(new Error(`Cannot find class ${className}`));
            }
        } else if (moduleName === 'jupyter-datawidgets') {
            if (this.testClasses[className]) {
                return Promise.resolve(this.testClasses[className]);
            } else {
                return Promise.reject(new Error(`Cannot find class ${className}`));
            }
        } else {
            return Promise.reject(new Error(`Cannot find module ${moduleName}`));
        }
    }

    _get_comm_info() {
        return Promise.resolve({});
    }

    _create_comm() {
        return Promise.resolve(new MockComm());
    }

    el: HTMLElement;

    testClasses: { [key: string]: any } = {};
}

export
interface ModelConstructor<T> {
    new (attributes?: any, options?: any): T;
}

export
function createTestModel<T extends widgets.WidgetModel>(
    constructor: ModelConstructor<T>,
    attributes?: any,
    widget_manager?: DummyManager,
    ): T {
  let id = widgets.uuid();
  let modelOptions = {
      widget_manager: widget_manager || new DummyManager(),
      model_id: id,
  }

  return new constructor(attributes, modelOptions);
}
