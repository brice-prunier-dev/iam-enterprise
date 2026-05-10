import {
    AnyDef,
    isArray,
    PATH_ROOT,
    IViewElement,
    AType,
    BaseType,
    PropertyTypology,
    Property,
    StringMap,
    ElementTypeBehaviour,
    asArray,
    ListValidationState,
    ValidationState,
    MetadataHelper,
    ValidationScopes,
    ISetElementOf,
    Scalar
} from '../core';

import {TarraySimpleItem} from './array-item.simple';
import {TarrayArrayItem} from './array-item.array';
import {TarrayTupleItem} from './array-item.tuple';
import {ArrayViewFactory} from './factory-aview';
import {J} from '@angular/cdk/keycodes';

/**
 * ──────────────────────────────────────────────────────────────────────────────────
 *                  A R R A Y  -  O B J E C T  -  P R O P E R T Y
 * ──────────────────────────────────────────────────────────────────────────────────
 */
export class TobjectArrayItemProperty implements Property, ElementTypeBehaviour {
    public static Matches(itemSchema: AnyDef): boolean {
        return itemSchema.type === 'array';
    }
    public readonly property: string;
    public readonly kind: PropertyTypology;
    public readonly typology: string;
    public readonly def: AType;
    public readonly item: AnyDef | BaseType | undefined;
    public readonly required: boolean;

    constructor(property: string, def: AType, required = true) {
        this.property = property;
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

    public innertype(): BaseType {
        return this.item as BaseType;
    }

    validate(state: ValidationState, target: any, scope: ValidationScopes, scopeRef?: any): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;
        if (!this.required && asArray(target) && target.length === 0) {
            if (MetadataHelper.asView(target)) {
                (target as unknown as IViewElement).$validation.clear();
            }
            state.setItemErrors(scopeRef as string, undefined);
        } else if (MetadataHelper.asView(target)) {
            const childValidation = target.validate(childScope);
            state.setItemErrors(scopeRef as string, childValidation.errors);
        } else {
            const childValidation = this.def.validate(target, childScope);
            state.setItemErrors(scopeRef as string, childValidation.errors);
        }
    }

    public defaultValue(): any {
        return this.def.defaultValue();
    }

    public prepare(obj: any, parent: any, path: string = PATH_ROOT) {
        const childObj = obj[path];
        if (childObj) {
            if (isArray(childObj)) {
                this.def.prepare(childObj, obj, path);
            }
        }
    }

    public unprepare(obj: any) {
        this.def.unprepare(obj);
    }
    /**
     * Read a property as a view.
     * @param obj value to read.
     */
    public readAsView(obj: any, view: IViewElement): any {
        const array = obj[this.property] as any[];
        if (array) {
            this.def.prepare(array, obj, this.property);

            const childView =
                this.def.viewctor !== undefined
                    ? new this.def.viewctor(array, view)
                    : ArrayViewFactory.Create(array, this.def, view);
            // if ( childView.$src === undefined) {
            //     MetadataHelper.link(array, childView, this.def);
            // }
            return childView;
        } else {
            const defaultValue = this.defaultValue();
            this.def.prepare(defaultValue, obj, this.property);

            const defaultChildView =
                this.def.viewctor !== undefined
                    ? new this.def.viewctor(defaultValue, view)
                    : ArrayViewFactory.Create(defaultValue, this.def, view);
            defaultChildView.$src.setPath(this.property);
            return defaultChildView;
        }
    }

    public assignNewViews(obj: any, view: IViewElement, isRootAssign: boolean) {
        const jsonArray = obj[this.property];
        if (jsonArray !== undefined) {
            const childView =
                this.def.viewctor !== undefined
                    ? new this.def.viewctor([], view)
                    : ArrayViewFactory.Create([], this.def, view);
            (childView as unknown as ISetElementOf<Scalar | IViewElement>).$assign(jsonArray, isRootAssign);
            (view as any)[this.property] = childView;
        }
    }
}
