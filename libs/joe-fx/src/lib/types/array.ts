import {
    isArray,
    asArray,
    RuntimeMessage,
    RuntimeSummary,
    AType,
    ArrayDef,
    AnyDef,
    ArrayItemProperty,
    StringMap,
    SetviewConstructor,
    PropertyTypology,
    MetadataHelper,
    PATH_ROOT,
    isAssigned,
    ListValidationState,
    isViewElement,
    ValidationState,
    REQUIRED_ERROR,
    IndexDef,
    asString,
    readPath,
    normalizePath,
    encodeSelector,
    wrapAsIndexSelector,
    PATH_UNASSIGNED,
    isBlank,
    TupleDef,
    ValidationScopes,
    OType,
    RuntimeError,
    PATH_NEXT,
    isObjAssigned,
    ElementMessageType,
    isEmptyArray,
    ValidationRule,
    JsObject,
    JsonObj
} from '../core';

import {TarraySimpleItem} from './array-item.simple';
import {TarrayArrayItem} from './array-item.array';
import {TarrayTupleItem} from './array-item.tuple';
import {TypeFactory} from './factory-type';
import {ArrayTypeFactory} from './factory-atype';

RuntimeError.register('_lstMinlength', (args) => {
    return `Required at least ${args['minlength']} item!`;
});

RuntimeError.register('_lstMaxlength', (args) => {
    const max = args['maxlength'];
    return `Required less than ${max} items!.`;
});

RuntimeError.register('_lstItemRequired', (args) => {
    const index = args['index'];
    return `${index}# should not be a null !`;
});

RuntimeError.register('_lstIndex', (args) => {
    const index = args['index'];
    return `${index} is not a unique identifier!`;
});

export class Tarray<T = any> implements AType {
    public readonly containsScalars: boolean;
    public readonly isTuple: boolean;

    /**
     * Index definition for Tuple
     * 'id' fields goes equals
     * and
     * 'sort' fiels goes flist sort.
     */
    public index?: IndexDef;
    public items: AnyDef | AnyDef[];
    public itemsTypeDef?: ArrayItemProperty;
    public maxlength: number;
    // public patern: number;
    public minlength: number;
    public size: number;
    public title: string;
    public type: 'array';
    public viewctor?: SetviewConstructor;
    public rules:  {_?: ValidationRule<T[]>};

    constructor(options: ArrayDef, name?: string) {
        this.type = 'array';
        this.size = 1;
        this.title = name || options.title;
        this.minlength = options.minlength;
        this.maxlength = options.maxlength;
        this.items = options.items;
        this.isTuple = false;
        this.index = (options as TupleDef).index;
        this.containsScalars = false;
        this.rules = {};
        if (isArray(this.items)) {
            if (TarrayTupleItem.Matches(this.items as AnyDef[], options)) {
                this.isTuple = true;
                this.index = (options as TupleDef).index;
                const tuple = (this.itemsTypeDef = new TarrayTupleItem(this, true, this.title));
                this.title = tuple.title;
            }
        } else {
            if (TarraySimpleItem.Matches(this.items as AnyDef)) {
                const itemType = TypeFactory.TYPEDEF(this.items as AnyDef);
                this.itemsTypeDef = new TarraySimpleItem(itemType);
                this.containsScalars = this.itemsTypeDef.kind === PropertyTypology.Scalar;
                if (!isAssigned(this.title)) {
                    this.title = itemType.title;
                }
            } /* if ( TarrayArrayItem.Matches( this.items as AnyDef ) ) */ else {
                const atype = TypeFactory.TYPEDEF(this.items as ArrayDef) as AType;
                this.itemsTypeDef = new TarrayArrayItem(atype);
                if (!isAssigned(this.title)) {
                    this.title = atype.title;
                }
                this.containsScalars = false;
                this.size += atype.size;
            }
        }
    }

    public get hasObjectItems(): boolean {
        return this.itemsTypeDef?.kind === PropertyTypology.Object;
    }

    public get hasScalarItems(): boolean {
        return this.itemsTypeDef?.kind === PropertyTypology.Scalar;
    }

    public get isMultiDimension(): boolean {
        return this.itemsTypeDef instanceof TarrayArrayItem;
    }

    public get withIndex(): boolean {
        return (this.itemsTypeDef?.def as unknown as OType).index !== undefined;
    }

    public get withTupleIndex(): boolean {
        return this.index !== undefined;
    }

    /**
     * Extract index {'.>[0]': 'xxx'} from obj (Xxx)
     */
    public buildIndexObjFromSelectorValue(value: string | number | (string | number)[]): JsonObj {
        const index: JsonObj = {};
        const indexDef = (this.itemsTypeDef?.def as unknown as OType).index;
        if(!indexDef){
            throw new Error(`Index definition is missing on "${this.title}"!`);
        }
        if (asArray(value)) {
            (indexDef.id as string[]).forEach((p, idx) => (index[p] = value[idx]));
        } else {
            index[indexDef.id[0]] = value;
        }

        return index;
    }

    public defaultValue(): T[] {
        const array = this.isTuple ? this.itemsTypeDef!.defaultValue() : [];
        return MetadataHelper.getTypeInfoSafe(array, this).obj;
    }

    public fillValidationSummary(
        objErrors: StringMap,
        summary: RuntimeSummary,
        path: string
    ): RuntimeSummary {
        if (isObjAssigned(objErrors)) {
            var objPath = path ?? PATH_ROOT;
            for (const errorIndex in objErrors) {
                if (errorIndex === '_') {
                    const arrayErrors = objErrors['_'];
                    for (const arrayErrorTypology in arrayErrors) {
                        if (
                            ['_badtype', '_lstMinlength', '_lstMaxlength', '_lstItemRequired'].includes(
                                arrayErrorTypology
                            )
                        ) {
                            const errorArgs = arrayErrors[arrayErrorTypology];
                            const msg = RuntimeError.errorText(arrayErrorTypology, errorArgs);

                            summary.push(
                                new RuntimeMessage(
                                    msg,
                                    objPath,
                                    arrayErrorTypology,
                                    ElementMessageType.Error
                                )
                            );
                        }
                    }
                } else if (this.containsScalars) {
                    const itemPath = objPath + PATH_NEXT + errorIndex;
                    for (const errorTypology in objErrors[errorIndex]) {
                        const errorArgs = objErrors[errorIndex][errorTypology];
                        const msg = `${errorIndex}: ${RuntimeError.errorText(errorTypology, errorArgs)}`;
                        summary.push(
                            new RuntimeMessage(
                                msg,
                                itemPath,
                                errorTypology,
                                ElementMessageType.Error
                            )
                        );
                    }
                }
            }
        }
        return summary;
    }

    /**
     * turn { id: 'xxx', ... } into '(xxx)'
     */
    public getIndexPath(obj: JsObject): string {
        if (!this.withIndex) return '';
        const indexVal = this.getIndexValue(obj);
        if (indexVal === null) {
            const errorText = `Index value is null on "${this.title}" instance: ${JSON.stringify(obj)}`;
            throw new Error(errorText);
        }
        return wrapAsIndexSelector(encodeSelector(indexVal));
    }

    public getIndexValue(obj: JsObject): null | string | number | (string | number)[] {
        if (!this.withIndex) {
            return null;
        }
        const idDef = (this.itemsTypeDef?.def as unknown as OType)?.index?.id;

        if (idDef) {
            if (asString(idDef)) {
                return readPath<string | number>(obj, normalizePath(idDef));
            } else {
                if (idDef.length === 1) {
                    return readPath<string | number>(obj, normalizePath(idDef[0]!))!;
                } else {
                    return idDef.map<string | number>((s) => readPath<string | number>(obj, normalizePath(s))!);
                }
            }
        }
        return null;
    }

    public isNew(obj: any): boolean {
        return isBlank(obj) || isEmptyArray(obj);
    }

    public options(): ArrayDef {
        return {
            type: 'array',
            title: this.title,
            minlength: this.minlength,
            maxlength: this.maxlength,
            items: this.items
        };
    }

    public prepare(obj: any, parent?: any, path: string = PATH_ROOT) {
        if (obj) {
            if (isArray(obj)) {
                const array = obj as any[];
                const notPrepared = MetadataHelper.isNotPrepared(array);
                const objInfo = MetadataHelper.getTypeInfoSafe(array, this);

                if (parent && (notPrepared || objInfo.detached)) {
                    const parentInfo = MetadataHelper.getTypeInfo(parent)!;
                    if (path != PATH_UNASSIGNED) {
                        if (parentInfo.isArray && this.withIndex) {
                            path = this.getIndexPath(obj);
                            if( path == '' ){
                                path = PATH_UNASSIGNED;
                            }
                        }
                    }
                    objInfo.setParent(path, parentInfo);
                } else if (!parent && (notPrepared || objInfo.detached)) {
                    objInfo.setPath(PATH_ROOT);
                    // JoeLogger.header(objInfo.type.title);
                }

                if (notPrepared && !this.containsScalars) {
                    if (this.isTuple) {
                        (this.itemsTypeDef as TarrayTupleItem).prepare(array, parent, path);
                    } else if (this.isMultiDimension) {
                        (this.itemsTypeDef as TarrayArrayItem).prepare(array, parent, path);
                    } else {
                        (this.itemsTypeDef as TarraySimpleItem).prepare(array, parent, path);
                    }
                }
            }
        }
    }

    public propType(): string {
        return '?'; // TODO TO_IMPLEMENT
    }

    public unprepare(obj: any) {
        if (obj && asArray(obj)) {
            const objInfo = MetadataHelper.getTypeInfo(obj);
            if (objInfo) {
                if (this.hasObjectItems) {
                    for (const item of obj) {
                        this.itemsTypeDef!.unprepare(item);
                    }
                }
                objInfo.release();
                MetadataHelper.clearTypeInfo(obj);
            }
        }
    }

    public validate(
        target: any,
        scope: ValidationScopes = ValidationScopes.State,
        scopeRef?: any
    ): ValidationState {
        const isView = isViewElement(target);
       
        const validationContext = isView
            ? (target.$validation as ListValidationState)
            : new ListValidationState();

        if (!validationContext.initialized || scope !== ValidationScopes.State) {
            if (target) {
                if (isArray(target)) {
                    const array = target as any[];
                    validationContext.clear('_');
                    const lstMinlength =
                        array.length < this.minlength
                            ? {
                                actualLength: array.length,
                                minlength: this.minlength
                            }
                            : undefined;
                    validationContext.setItemError('_', '_lstMinlength', lstMinlength);

                    const lstMaxlength =
                        this.maxlength && array.length > this.maxlength
                            ? {
                                actualLength: array.length,
                                maxlength: this.maxlength
                            }
                            : undefined;
                    validationContext.setItemError('_', '_lstMaxlength', lstMaxlength);

                    if(scope === ValidationScopes.RemoveChild){
                        validationContext.setItemErrors(scopeRef, undefined);
                    }else if(scope === ValidationScopes.Rule){
                        if ( isObjAssigned(this.rules._)) {
                            validationContext.setItemErrors(
                                '_',
                                this.rules._!.rule(array as T[])
                            );
                        }
                    } else{
                        this.itemsTypeDef!.validate(validationContext, array, scope, scopeRef);
                    }
                    

                    return validationContext as ValidationState;
                } else {
                    validationContext.setItemErrors('_', {_badtype: {typedef: 'Array'}});
                }
            } else {
                validationContext.errors = {_: REQUIRED_ERROR};
            }
        }
        validationContext.initialized = true;
        validationContext.initialized = true;
        return validationContext;
    }
}

ArrayTypeFactory.InitializeConstructor(Tarray);
