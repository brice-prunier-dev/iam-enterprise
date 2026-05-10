import { MType, MapTypeConstructor, MapDef } from '../core';



export namespace MapTypeFactory {
    let _mapConstructor: MapTypeConstructor;

    export function InitializeConstructor(typeConstructor: MapTypeConstructor) {
        _mapConstructor = typeConstructor;
    }

    export function Create(sch: MapDef): MType {
        return new _mapConstructor(sch);
    }
}
