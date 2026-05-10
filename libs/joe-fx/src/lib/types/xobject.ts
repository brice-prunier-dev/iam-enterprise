import {
    PATH_ROOT,
    OType,
    ObjviewConstructor,
    XType,
    XObjectDef,
    isStringAssigned,
    MetadataHelper,
    BaseElementType,
    IndexableType,
    ValidationState,
    ValidationHandler,
    JsonObj,
    ValidationScopes
} from '../core';
import {ObjectTypeFactory} from './factory-otype';

import {XObjectTypeFactory} from './factory-xtype';

/**
 * Object Type that accept different type definition as implementation
 */
export class Txobject<T = any> implements XType<T>, BaseElementType {
    public readonly containsScalars: boolean;
    /**
     * Type of the object 
     * 
     * Comply with Json schema spec except that xobject is used instead of object to specify an union type.
     */
    public readonly type: 'xobject';
    public readonly anyOf: OType[];
    /**
     * Title of the object type (match Json schema spec)
     */
    public title: string;
    public getIndexObjFromValue: (value: any | any[]) => JsonObj;

    constructor(private _def: XObjectDef<T>, name?: string) {
        this.type = 'xobject';
        this.containsScalars = false;
        this.title = name ?? _def.title;
        this.anyOf = _def.anyOf.map((s) => ObjectTypeFactory.Create(s));
        //this.anyOf = _def.anyOf;
        this.getIndexObjFromValue = _def.getIndexObjFromValue;
    }

    public get withIndex(): boolean {
        return !this.anyOf.some((s) => !(s as IndexableType).withIndex);
    }

    public getType(obj: any): OType<T> {
        return this._def.getType(obj);
    }

    public viewctor(obj: any): ObjviewConstructor {
        return this.getType(obj).viewctor!;
    }

    /**
    * return the index object of the first 'anyOf' type.
    * @remark using `union type` in a collection required having the same index definition among all `anyOf` types.
    * 
    * An `index object` is a json instance of index key/values: { id: 'id'}
    * input `keyDef` is 5
    * return will be { id: 5 };
    * @param keyDef values matching the index definition
    */
    public buildIndexObjFromSelectorValue(value: (string | number)[]): any {
        return this.anyOf[0]!.buildIndexObjFromSelectorValue(value);
    }
    public getIndexPath(obj: any, index?: number): string {
        return this.getType(obj).getIndexPath(obj, index);
    }

    public getIndexValue(obj: any): null | string | number | (string | number)[] {
        return this.getType(obj).getIndexValue(obj);
    }

    /**
     * Visit the object graph and set on each instance a Symbol property with a DataInfo instance
     * that is a reverse linkedList of parent.
     * DataInfo also expose the underlying type of the instance and its path in the graph.
     * @param target instance to validate (required).
     * @returns ValidationResult, map of errors by property name;
     */
    public prepare(obj: any, parent?: any, path: string = PATH_ROOT) {
        if (obj) {
            const objType = this.getType(obj);
            if (objType) {
                return objType.prepare(obj, parent, path);
            }
        }
    }

    public unprepare(obj: any) {
        const objType = this.getType(obj);
        if (objType) {
            objType.unprepare(obj);
        }
    }

    /**
     * Check the validity of an object instance on the current schema.
     * @param subject instance to validate (required).
     * @returns ValidationResult, map of errors by property name;
     */
    public validate(
        subject: any,
        scope: ValidationScopes = ValidationScopes.State,
        scopeRef?: any
    ): ValidationState {
        const objType = this.getType(subject);
        if (objType) {
            return objType.validate(subject, ValidationScopes.State);
        }
        const objInfo = MetadataHelper.getTypeInfo(subject);
        return new ValidationHandler({
            _: {badtype: objInfo !== undefined ? objInfo?.type.title : '?'}
        });
    }

    public validateAsync(
        subject: any,
        scope: ValidationScopes = ValidationScopes.State,
        scopeRef?: string | boolean | object
    ): void {
        const objType = this.getType(subject);
        if (objType) {
            return objType.validateAsync(subject, ValidationScopes.State, scopeRef);
        }
    }

    public defaultValue(typename?: string): any {
        if (isStringAssigned(typename)) {
            const extendType = this.anyOf.find((s) => s.title === typename);
            if (extendType) {
                return extendType.defaultValue();
            }
        }
        return undefined;
    }
}

XObjectTypeFactory.InitializeConstructor(Txobject);
