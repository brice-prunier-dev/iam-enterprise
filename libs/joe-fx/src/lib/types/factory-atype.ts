import { AType, ArrayTypeConstructor, ArrayDef } from '../core';

let _arrayConstructor: ArrayTypeConstructor;

export module ArrayTypeFactory {
    export function InitializeConstructor(typeConstructor: ArrayTypeConstructor) {
        _arrayConstructor = typeConstructor;
    }

    export function Create(sch: ArrayDef): AType {
        return new _arrayConstructor(sch);
    }
}
