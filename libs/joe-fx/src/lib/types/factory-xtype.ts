import { XObjectDef, XType, XObjectTypeConstructor } from '../core';

let _xobjectConstructor: XObjectTypeConstructor;
export module XObjectTypeFactory {
    export function InitializeConstructor(typeConstructor: XObjectTypeConstructor) {
        _xobjectConstructor = typeConstructor;
    }

    export function Create<T = any>(sch: XObjectDef<T>): XType<T> {
        return new _xobjectConstructor(sch);
    }
}
