import { ObjectDef, OType, ObjectTypeConstructor } from '../core';

let _objectConstructor: ObjectTypeConstructor;

export module ObjectTypeFactory {
    export function InitializeConstructor(typeConstructor: ObjectTypeConstructor) {
        _objectConstructor = typeConstructor;
    }

    export function Create<T = any>(sch: ObjectDef<T>): OType<T> {
        return new _objectConstructor(sch);
    }
}
