// Type definitions for jupyter-threejs
// Project: threeplot
// Definitions by: vidartf


declare module 'jupyter-threejs' {

      import { WidgetModel } from '@jupyter-widgets/base';
      import * as THREE from 'three';

      export
      interface ICacheDescriptor {
        id: string;
      }

      export
      class ThreeModel extends WidgetModel {
        createPropertiesArrays(): void;
        setupListeners(): void;
        processNewObj(obj: any): any;
        createThreeObjectAsync(): Promise<any>;
        constructThreeObject(): any | Promise<any>;
        getCacheDescriptor(): ICacheDescriptor | void;
        getThreeObjectFromCache(cacheDescriptor: ICacheDescriptor): any | undefined;
        putThreeObjectIntoCache(cacheDescriptor: ICacheDescriptor, object: any): void;
        onCustomMessage(content: any, buffers: any): void;
        onExecThreeObjMethod(methodName: string, args: any[], buffer: any);
        onChange(model: ThreeModel, options: any);
        onChildChanged(model: ThreeModel, options: any);
        syncToThreeObj(): void;
        syncToModel(): void;

        obj: any;
        three_properties: string[];
        three_nested_properties: string[];
        datawidget_properties: string[];
        initPromise: Promise<any>;
      }

      export
      class Object3DModel extends ThreeModel {
        obj: THREE.Object3D;
      }

      export
      class BlackboxModel extends Object3DModel {
        abstract constructThreeObject():any | Promise<any>;
      }

      export
      function computeBoundingBox(scene: THREE.Scene | THREE.Object3D): THREE.Box3;

      export
      function computeBoundingSphere(scene: THREE.Scene | THREE.Object3D): THREE.Sphere;

    }
