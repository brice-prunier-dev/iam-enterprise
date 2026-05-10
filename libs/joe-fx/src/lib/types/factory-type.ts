import {
    AnyDef,
    BaseType,
    ArrayDef,
    ObjectDef,
    MapDef,
    XObjectDef,
    isJoeType,
    XType
} from '../core';

import { ArrayTypeFactory } from './factory-atype';
import { ObjectTypeFactory } from './factory-otype';
import { MapTypeFactory } from './factory-mtype';
import { Tnumber } from './number';
import { Tstring } from './string';
import { Tbool } from './bool';
import { XObjectTypeFactory } from './factory-xtype';

export namespace TypeFactory {
    export function TYPEDEF(sch: AnyDef): AnyDef & BaseType {
        if (isJoeType(sch)) {
            return sch as AnyDef & BaseType;
        }
        switch (sch.type) {
            case 'number':
                return new Tnumber(sch);
            case 'string':
                return new Tstring(sch);
            case 'boolean':
                return new Tbool(sch);
            case 'array':
                return ArrayTypeFactory.Create(sch as ArrayDef);
            case 'map':
                return MapTypeFactory.Create(sch as MapDef);
            default:
                return ObjectTypeFactory.Create(sch as ObjectDef);
        }
    }
    export function XTYPEDEF(sch: XObjectDef): XType {
        if (isJoeType(sch)) {
            return sch as XType;
        }
        return XObjectTypeFactory.Create(sch);
    }
}
