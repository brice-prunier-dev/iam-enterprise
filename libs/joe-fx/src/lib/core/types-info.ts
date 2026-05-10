import { PATH_ROOT } from './constants';
import { PropertyTypology, ValidationScopes } from './enums';
import {
    AnyDef,
    IDataInfo,
    IEditor,
    IViewElement,
    JsObject,
    NULL_ValidationState,
    ValidationState
} from './types';
import { asJsObject } from './types-helper';

export const NULL_Editor: IEditor = {
    isPristine: () => true,
    endEdit: () => null,
    cancelEdit: () => null,
    isTouched: () => false,
    isDirty: () => false,
    writeChangeSet: () => null,
    applyChangeSet: () => null
};
/**
 * Default Null instance for IViewElement.
 */
export const NULL_ViewElement: IViewElement = {
    $children: () => undefined,
    $edit: () => NULL_Editor,
    $endEdit: () => null,
    $isEditing: false,
    $canSave: false,
    $tracking: false,
    $isRoot: () => false,
    $json: () => [],
    $notify: () => null,
    $parent(): IViewElement {
        return this;
    },
    $release(): void {
        return;
    },
    $root(): IViewElement {
        return this;
    },
    $src: {} as unknown as IDataInfo,
    validate(
        scope: ValidationScopes = ValidationScopes.State,
        scopeRef?: string | boolean | object
    ): ValidationState {
        return {} as unknown as ValidationState;
    },
    $validation: NULL_ValidationState,
    $asString() {
        return 'NULL_ViewElement';
    }
};

export type DataInfoConstructor = new (obj: any, type: any) => IDataInfo;

let TYPEINFO_CONSTRUCTOR: DataInfoConstructor;

const infoKey = '__j-info__';
const infoSym = Symbol(infoKey);

export class MetadataHelper {
    static initTypeInfoFactory(dataInfoFactory: DataInfoConstructor) {
        TYPEINFO_CONSTRUCTOR = dataInfoFactory;
    }

    static isNotPrepared(obj: JsObject): boolean {
        const src = MetadataHelper.getTypeInfo( obj);
        return src === undefined || src.path === undefined;
    }
    static getTypeInfoWithCheck(obj: JsObject | undefined): IDataInfo | undefined {
        return obj !== undefined && typeof obj === 'object' ? MetadataHelper.getTypeInfo( obj) : undefined;
    }
    static getTypeInfoSafe(obj: JsObject, type: any): IDataInfo {
        const info = obj[infoSym] as IDataInfo;
        if (info) {
            return info;
        }
        return (obj[infoSym] = new TYPEINFO_CONSTRUCTOR(obj, type));
    }
    static getTypeInfo(obj: JsObject): IDataInfo | undefined {
        const info = obj[infoSym]  as IDataInfo | undefined;
        return info;
    }
    static unsureTypeInfo(obj: JsObject, type: AnyType) {
        if (!obj[infoSym]) {
            obj[infoSym] = new TYPEINFO_CONSTRUCTOR(obj, type);
        }
    }

    static clearTypeInfo(obj: JsObject): void {
        const info = MetadataHelper.getTypeInfo(obj);
        if (info !== undefined) {
             obj[infoSym] = undefined;
             info.release();
        }
    }

    static asView(obj: any): obj is IViewElement {
        if (obj && asJsObject(obj)) {
            const src = MetadataHelper.getTypeInfo(obj);
            if (src) {
                return obj !== src.obj;
            }
        }
        return false;
    }

    static link(obj: any, view: any, type?: any) {
        const isObjUndefined = obj === undefined;
        if (isObjUndefined) {
            if (type) {
                obj = type.defaultValue();
            } else {
                throw new Error(
                    'Invalid Link operation: source is undefined no source type has been provided to create a default value!'
                );
            }
        }
        const info = (obj as any)[infoSym] as IDataInfo;
        if (info === undefined) {
            if (type !== undefined) {
                view[infoSym] = obj[infoSym] = new TYPEINFO_CONSTRUCTOR(obj, type);
            } else {
                throw new Error(
                    'Invalid Link operation: source info is missing and no source type has been provided!'
                );
            }
        } else {
            if( info.type !== type) {
                (info as any)['_type'] = type;
            }
            view[infoSym] = info;
            const sym = MetadataHelper.getTypeInfo(view);
            if( sym === undefined ) {
                throw new Error(
                    'Invalid Link operation: symbol can not be set!'
                );
            }
        }
    }

    static releaseDoc(obj: any, recursive: boolean = false): void {
        if (obj) {
            if (typeof obj === 'object') {
                if (Array.isArray(obj) && obj.length > 0) {
                    if (obj[0] !== undefined && typeof obj[0] === 'object') {
                        for (const child of obj) {
                            MetadataHelper.releaseDoc(child, recursive);
                        }
                    }
                } else if (recursive) {
                    for (const p in obj) {
                        if (obj.hasOwnProperty(p)) {
                            MetadataHelper.releaseDoc(obj[p], recursive);
                        }
                    }
                }
                const info = obj[infoSym] as IDataInfo;
                if (info) {
                    info.release();
                }
            }
        }
    }

    static detach(obj: any, recursive: boolean = false): void {
        if (obj && typeof obj === 'object') {
            const info = MetadataHelper.getTypeInfo(obj);
            if (info) {
                info.setParent(PATH_ROOT, undefined as unknown as IDataInfo);
            }
        }
    }
}

export function toPropertyTypology(sch: AnyDef): PropertyTypology {
    switch (sch.type) {
        case 'object':
            return PropertyTypology.Object;
        case 'map':
            return PropertyTypology.Map;
        case 'array':
            const asch = sch as any;
            return asch.isTuple ? PropertyTypology.Tuple : PropertyTypology.List;
        default:
            return PropertyTypology.Scalar;
    }
}

export function readTypeName(obj: any): string {
    if (obj[infoSym] && obj[infoSym].type) {
        return obj[infoSym].type.title;
    } else {
        return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase() as string;
    }
}

export function cacheValueAsValue(value: any): any {
    return value === NULL_ViewElement ? undefined : value;
}

export function asViewElement(obj: JsObject): obj is IViewElement {
    if (typeof obj === 'object') {
        return obj['$src'] !== undefined;
    }
    return false;
}
