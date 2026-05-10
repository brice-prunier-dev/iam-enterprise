import {
    AnyTypeKey,
    PropertyTypology,
    AnyDef,
    BaseType,
    PATH_ROOT,
    MapProperty,
    toPropertyTypology,
    IViewElement,
    StringMap,
    isViewElement,
    ListValidationState,
    REQUIRED_ERROR,
    isBlank,
    MetadataHelper,
    ValidationState,
    ValidationScopes,
    asObject,
    Scalar,
    IMapElementOf
} from '../core';
import {Tobject} from './object';
import {Tarray} from './array';
import {MapViewFactory} from './factory-mview';


export class TmapSimpleItem implements MapProperty {
    public static Matches(itemSchema: AnyDef): boolean {
        return itemSchema.type !== 'array';
    }
    public readonly kind: PropertyTypology;
    public readonly typology: AnyTypeKey;
    public readonly def: AnyDef & BaseType;
    public readonly required: boolean;
    constructor(def: AnyDef & BaseType, required: boolean = true) {
        this.required = required;
        this.def = def;
        this.kind = toPropertyTypology(def);
        this.typology = def.type;
    }

    public innertype(): BaseType {
        return this.def;
    }

    validate(state: ValidationState, target: any, scope: ValidationScopes, scopeRef?: any): void {
        
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;

        const mapKeys = MetadataHelper.asView(target)
            ? (target as any).keys() as string[]
            : Object.keys(target).filter(
                (k) => typeof target[k] === 'object' && !k.startsWith('_') && !k.endsWith('_')
            );
        const childrenVal = new ListValidationState();
        mapKeys.forEach((propName: string) => {
            if (!propName.startsWith('$')) {
                const mapItem = target[propName];

                if (isBlank(mapItem)) {
                    childrenVal.setItemErrors(`[${propName}]`, REQUIRED_ERROR);
                } else if (this.def.containsScalars) {
                    childrenVal.setItemErrors(
                        `[${propName}]`,
                        this.def.validate(mapItem, childScope).errors
                    );
                } else {
                    childrenVal.setItemErrors(
                        `[${propName}]`,
                        isViewElement(mapItem)
                            ? mapItem.validate(childScope).errors
                            : this.def.validate(mapItem, childScope).errors
                    );
                }
            }
        });
    }
    validateRule(state: ValidationState, target: any, scope: ValidationScopes, scopeRef?: any): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;

        const mapKeys = MetadataHelper.asView(target)
            ? (target as any).keys() as string[]
            : Object.keys(target).filter(
                (k) => typeof target[k] === 'object' && !k.startsWith('_') && !k.endsWith('_')
            );
        const childrenVal = new ListValidationState();
        mapKeys.forEach((propName: string) => {
            if (!propName.startsWith('$')) {
                const mapItem = target[propName];

                if (isBlank(mapItem)) {
                    childrenVal.setItemErrors(`[${propName}]`, REQUIRED_ERROR);
                } else if (this.def.containsScalars) {
                    childrenVal.setItemErrors(
                        `[${propName}]`,
                        this.def.validate(mapItem, childScope).errors
                    );
                } else {
                    childrenVal.setItemErrors(
                        `[${propName}]`,
                        isViewElement(mapItem)
                            ? mapItem.validate(childScope).errors
                            : this.def.validate(mapItem, childScope).errors
                    );
                }
            }
        });
    }


    public defaultValue(): any {
        return this.def.defaultValue();
    }

    public prepare(child: any, map: any, path: string = PATH_ROOT) {
        if (child) {
            switch (this.kind) {
                case PropertyTypology.Tuple:
                case PropertyTypology.List:
                    (this.def as Tarray).prepare(child, map, path);
                    break;
                case PropertyTypology.Map:
                case PropertyTypology.Object:
                    (this.def as Tobject<any>).prepare(child, map, path);
                    break;
                default:
                    return;
            }
        }
    }
    public unprepare(obj: any) {
        if (obj) {
            switch (this.kind) {
                case PropertyTypology.Tuple:
                case PropertyTypology.List:
                    (this.def as Tarray).unprepare(obj);
                    break;
                case PropertyTypology.Map:
                case PropertyTypology.Object:
                    (this.def as Tobject<any>).unprepare(obj);
                    break;
                default:
                    return;
            }
        }
    }
    public readAsView(obj: any, key: string, view: IViewElement): any {
        const child = obj[key];
        if (child) {
            const otype = this.def as Tobject<any>;
            // otype.prepare(child, obj, key);
            switch (this.kind) {
                case PropertyTypology.Object:
                    if (otype.viewctor === undefined) {
                        throw new Error(`${otype.title} has no view configured!`);
                    }
                    // return new otype.viewctor(child, view);

                    const childView = new otype.viewctor(child, view);
                    // childView.$src.setPath(key);
                    return childView;

                case PropertyTypology.Map:
                    // return MapViewFactory.Create(child, obj, view);

                    const mapChildView = MapViewFactory.Create(child, obj, view);
                    // mapChildView.$src.setPath(key);
                    return mapChildView;

                default:
                    return child;
            }
        }
        return undefined;
    }

    
}
