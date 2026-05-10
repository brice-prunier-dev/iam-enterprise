import {
    asObject,
    isAssigned,
    RuntimeMessage,
    RuntimeSummary,
    MType,
    ArrayDef,
    AnyDef,
    MapProperty,
    StringMap,
    PropertyTypology,
    MetadataHelper,
    MapviewConstructor,
    PATH_ROOT,
    AType,
    MapDef,
    ListValidationState,
    isViewElement,
    isArrayAssigned,
    isBlank,
    ValidationState,
    ValidationScopes,
    StringDef,
    NumberDef,
    RuntimeError,
    PATH_NEXT,
    isObjAssigned,
    ElementMessageType,
    isArray,
    PATH_UNASSIGNED,
    ValidationRule,
    toArray
} from '../core';
import {TmapSimpleItem} from './map-item.simple';
import {TmapArrayItem} from './map-item.array';
import {TypeFactory} from './factory-type';
import {MapTypeFactory} from './factory-mtype';
import { corelateValidationWithParents } from './common';

RuntimeError.register('mapMinlength', (args) => {
    const min = args['minlength'];
    return `Required at least ${min} items!`;
});

RuntimeError.register('mapMaxlength', (args) => {
    const max = args['maxlength'];
    const l = args['length'];
    return !!l
        ? `Is bounded to a maximum of ${max} items! (currently: ${l}).`
        : `Is bounded to a maximum of ${max} items!.`;
});
/**
 * 
 */
export class Tmap<T = any> implements MType {
    // #region Properties

    readonly isTuple: boolean;

    readonly containsScalars: boolean;
    rules:  Record<string, ValidationRule<Record<string, T>>>;
    items: AnyDef | AnyDef[];
    itemsTypeDef?: MapProperty;
    key: StringDef | NumberDef;
    maxlength: number;
    // patern: number;
    minlength: number;
    size: number;
    title: string;
    type: 'map';
    viewctor?: MapviewConstructor;
    // #endregion Properties

    // #region Constructors

    constructor(options: MapDef, name?: string) {
        this.type = 'map';
        this.size = 1;
        this.containsScalars = false;
        this.title = name || options.title;
        this.minlength = options.minlength;
        this.maxlength = options.maxlength;
        this.items = options.items;
        this.isTuple = isArray(this.items);
        this.rules = {};
        this.key = TypeFactory.TYPEDEF(options.key) as StringDef | NumberDef;
        if (TmapSimpleItem.Matches(this.items as AnyDef)) {
            const itemType = TypeFactory.TYPEDEF(this.items as AnyDef);
            this.itemsTypeDef = new TmapSimpleItem(itemType);
            if (this.itemsTypeDef.kind === PropertyTypology.Scalar) {
                this.containsScalars = true;
            }
            if (!isAssigned(this.title)) {
                this.title = itemType.title;
            }
        } else if (TmapArrayItem.Matches(this.items as AnyDef)) {
            const atype = TypeFactory.TYPEDEF(this.items as ArrayDef) as AType;
            this.itemsTypeDef = new TmapArrayItem(atype);
            if (!isAssigned(this.title)) {
                this.title = atype.title;
            }
            this.size += atype.size;
        }
    }

    // #endregion Constructors

    // #region Public Accessors

    get isMultiDimension(): boolean {
        return this.itemsTypeDef instanceof TmapArrayItem;
    }

    // #endregion Public Accessors

    // #region Public Methods

    defaultValue(): any {
        const obj = {};
        return MetadataHelper.getTypeInfoSafe(obj, this).obj;
    }

    fillValidationSummary(
        objErrors: StringMap,
        summary: RuntimeSummary,
        path: string
    ): RuntimeSummary {
        if (isObjAssigned(objErrors)) {
            const objPath = path ?? PATH_ROOT;
            for (const errorIndex in objErrors) {
                if (errorIndex === '_') {
                    const arrayErrors = objErrors['_'];
                    for (const arrayErrorTypology in arrayErrors) {
                        if (['_badtype', '_mapMinlength', '_mapMaxlength'].includes(arrayErrorTypology)) {
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
                    for (const itemErrorTypology in objErrors[errorIndex]) {
                        const errorArgs = objErrors[errorIndex][itemErrorTypology];
                        const msg = `${errorIndex}: ${RuntimeError.errorText(itemErrorTypology, errorArgs)}`;
                        summary.push(
                            new RuntimeMessage(
                                msg,
                                itemPath,
                                itemErrorTypology,
                                ElementMessageType.Error
                            )
                        );

                    }
                }
            }
        }
        return summary;
    }

    options(): ArrayDef {
        return {
            type: 'array',
            title: this.title,
            minlength: this.minlength,
            maxlength: this.maxlength,
            items: this.items
        };
    }

    prepare(map: any, parent?: any, path: string = PATH_ROOT) {
        if (map) {
            const notPrepared = MetadataHelper.isNotPrepared(map);
            const objInfo = MetadataHelper.getTypeInfoSafe(map, this);
     
            if (parent && (notPrepared || objInfo.detached)) {
                const parentInfo = MetadataHelper.getTypeInfo(parent)!;
                if (path === PATH_ROOT) {
                    path = PATH_UNASSIGNED;
                }
                objInfo.setParent(path, parentInfo);
                
            } else if (!parent && (notPrepared || objInfo.detached)) {
                objInfo.setPath(PATH_ROOT);
            }
            if (notPrepared) {
                const keys = Object.keys(map);
                if (isArrayAssigned(keys)) {
                    keys.forEach((property) => {
                        const mapChild = map[property];
                        this.itemsTypeDef!.prepare(mapChild, map, property);
                    });
                }
            }
        }
    }

    public isNew(obj: any): boolean {
        return isBlank(obj) || Object.keys(obj).length === 0;
    }

    propType(): string {
        return '?'; // TODO TO_IMPLEMENT
    }

    unprepare(obj: any) {
        if (obj && typeof obj === 'object') {
            const objInfo = MetadataHelper.getTypeInfo(obj);
            if (objInfo) {
                const itemTypeDef = this.itemsTypeDef!;
                if (itemTypeDef!.kind !== PropertyTypology.Scalar) {
                    const keys = Object.keys(obj);
                    keys.forEach((property) => itemTypeDef.unprepare(obj[property]));
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

        const validationContext = isViewElement(target)
            ? (target.$validation as ListValidationState)
            : new ListValidationState();

        if (!validationContext.initialized || scope !== ValidationScopes.State) {
            if (asObject(target)) {
                const keys = Object.keys(target).filter(
                    (k) =>
                        typeof target[k] === 'object' &&
                        !k.startsWith('_') &&
                        !k.endsWith('_') &&
                        !k.startsWith('$') &&
                        !k.endsWith('$')
                );

                const mapMinlength =
                    keys.length < this.minlength
                        ? {actualLength: keys.length, minlength: this.minlength}
                        : undefined;
                validationContext.setItemError('_', 'mapMinlength', mapMinlength);

                const mapMaxlength =
                    this.maxlength && keys.length > this.maxlength
                        ? {actualLength: keys.length, maxlength: this.maxlength}
                        : undefined;
                validationContext.setItemError('_', 'mapMaxlength', mapMaxlength);

                if(scope === ValidationScopes.RemoveChild){
                    validationContext.setItemErrors(scopeRef, undefined);
                }else {
                    this.itemsTypeDef!.validate(validationContext, target, scope, scopeRef);
                }

            } else {
                validationContext.setItemError('_', '_badtype', {typedef: 'Map'});
            }
        }
       
        if (asObject(target) && isObjAssigned(this.rules)) {
             
                const keys = Object.keys(target).filter(
                    (k) =>
                        typeof target[k] === 'object' &&
                        !k.startsWith('_') &&
                        !k.endsWith('_') &&
                        !k.startsWith('$') &&
                        !k.endsWith('$')
                );

            
                for (const [ruleTarget, validationRule] of Object.entries(this.rules)) {
                    if (isAssigned(validationRule) && keys.includes(ruleTarget)) {

                        const prerequisits = [ruleTarget, ...toArray(validationRule.prerequisits)];
                        if (validationContext.matchPrerequisits(prerequisits)) {
                            validationContext.setItemErrors(
                                ruleTarget,
                                validationRule!.rule(target)
                            );
                        }
                    } else if (ruleTarget === '_') {
                        const prerequisits = [...toArray(validationRule.prerequisits)];
                        if (validationContext.matchPrerequisits(prerequisits)) {
                            validationContext.setItemErrors(
                                '_',
                                validationRule!.rule(target)
                            );
                        }
                    }
                }
                
        }
        
        return validationContext;
    }

    // #endregion Public Methods
}

MapTypeFactory.InitializeConstructor(Tmap);
