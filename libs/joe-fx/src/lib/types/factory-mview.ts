import {MapviewConstructor, MType, StringMap, IViewElement} from '../core';

let _mapViewConstructor: MapviewConstructor;

export module MapViewFactory {
    export function InitializeConstructor(viewctor: MapviewConstructor) {
        _mapViewConstructor = viewctor;
    }

    export function Create<T>(
        obj: any,
        type?: MType,
        parent?: any
    ): IterableIterator<T> & IViewElement & StringMap<T> {
        return new _mapViewConstructor(obj, parent, type) as IterableIterator<T> & IViewElement & StringMap<T>;
    }
}
