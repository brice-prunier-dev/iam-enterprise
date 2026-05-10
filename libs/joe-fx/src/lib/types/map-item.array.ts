import {
    IViewElement,
    isArray,
    PATH_ROOT,
    AType,
    AnyDef,
    BaseType,
    MapProperty,
    PropertyTypology,
    StringMap,
    ListValidationState,
    isViewElement,
    ValidationState,
    ValidationScopes
} from '../core';
import { TarrayArrayItem } from './array-item.array';
import { TarraySimpleItem } from './array-item.simple';
import { TarrayTupleItem } from './array-item.tuple';
import { ArrayViewFactory } from './factory-aview';

/**
 * ──────────────────────────────────────────────────────────────────────────────────
 *                  A R R A Y  -  O B J E C T  -  P R O P E R T Y
 * ──────────────────────────────────────────────────────────────────────────────────
 */
export class TmapArrayItem implements MapProperty {
    public static Matches(itemSchema: AnyDef): boolean {
        return itemSchema.type === 'array';
    }
    public readonly kind: PropertyTypology;
    public readonly typology: string;
    public readonly def: AType;
    public readonly item: AnyDef | BaseType | undefined;
    public readonly required: boolean;

    constructor(def: AType, required: boolean = true) {
        this.required = required;
        this.kind = PropertyTypology.List;
        this.def = def;
        switch (def.itemsTypeDef!.kind) {
            case PropertyTypology.List:
                const listProp = def.itemsTypeDef as TarrayArrayItem;
                this.item = listProp.item;
                this.typology = listProp.item.title;
                break;
            case PropertyTypology.Object:
            case PropertyTypology.Scalar:
                const simpleProp = def.itemsTypeDef as TarraySimpleItem;
                this.item = simpleProp.def;
                this.typology = simpleProp.def.title;
                break;
            default:
                const tupleProp = def.itemsTypeDef as TarrayTupleItem;
                this.typology = tupleProp.title;
                break;
        }
    }

    public get size() {
        return this.def.size;
    }

    public innertype(val: any): BaseType {
        return this.item as BaseType;
    }

    validate(state: ValidationState, subject: any, scope: ValidationScopes, scopeRef?: any): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;

        const mapKeys = Object.keys(subject).filter(
            (k) => typeof subject[k] === 'object' && !k.startsWith('_') && !k.endsWith('_')
        );
        const childrenVal = new ListValidationState();
        mapKeys.forEach((propName: string) => {
            const mapItem = subject[propName];
            childrenVal.setItemErrors(
                `[${propName}]`,
                isViewElement(mapItem)
                    ? mapItem.validate(childScope).errors
                    : this.def.validate(mapItem, childScope).errors
            );
        });
    }

    public defaultValue(): any {
        return this.def.defaultValue();
    }

    public prepare(child: any, map: any, path: string = PATH_ROOT) {
        if (child && isArray(child)) {
            this.def.prepare(child, map, path);
        }
    }

    public unprepare(obj: any) {
        this.def.unprepare(obj);
    }

   
    /**
     * Property Read method : It enforces Expando definition on any json object read.
     * Expando will typed
     */
    public readAsView(obj: any, key: string, view: IViewElement): any {
        const childArray = obj[key] as any[];
        if (childArray) {
            this.def.prepare(childArray, obj, key);
            // return ArrayViewFactory.Create(childArray, this.def, view);

            const childArrayView = ArrayViewFactory.Create(childArray, this.def, view);
            // childArrayView.$src.setPath(key);
            return childArrayView;
        }
        return undefined;
    }
}
