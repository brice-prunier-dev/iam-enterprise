import {
    PATH_ROOT,
    IViewElement,
    AnyTypeKey,
    AnyDef,
    BaseType,
    PropertyTypology,
    Property,
    StringMap,
    XType,
    ElementTypeBehaviour,
    ValidationState,
    MetadataHelper,
    ValidationScopes
} from '../core';
import {Txobject} from './xobject';

/**
 * ──────────────────────────────────────────────────────────────────────────────────
 *                   S I M P L E - O B J E C T - P R O P E R T Y
 * ──────────────────────────────────────────────────────────────────────────────────
 */
export class TxobjectSimpleProperty implements Property, ElementTypeBehaviour {
    public static Matches(itemSchema: AnyDef): boolean {
        return itemSchema.type === 'xobject';
    }
    public readonly def: Txobject;
    public readonly kind: PropertyTypology;
    public readonly required: boolean;
    public readonly property: string;
    public readonly typology: AnyTypeKey;
    constructor(property: string, def: XType, required: boolean = true) {
        this.property = property;
        this.required = required;
        this.def = def as Txobject;
        this.kind = PropertyTypology.Object;
        this.typology = def.type;
    }

    public innertype(): BaseType {
        return this.def;
    }

    public prepare(obj: any, parent: any, path: string = PATH_ROOT) {
        this.def.prepare(obj[path], obj, path);
    }

    public unprepare(obj: any) {
        this.def.unprepare(obj);
    }

    validate(state: ValidationState, target: any, scope: ValidationScopes, scopeRef?: any): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;
        const childValidation = MetadataHelper.asView(target)
            ? target.validate(ValidationScopes.State)
            : this.def.validate(target, childScope);
        state.setItemErrors(scopeRef as string, childValidation.errors);
    }

    public defaultValue(): any {
        return undefined;
    }

    public readAsView(obj: any, view: IViewElement): any {
        const value = obj[this.property];
        if (value) {
            const otype = this.def.getType(value);
            otype.prepare(value, obj, this.property);
            // return new otype.viewctor!(value, view);

            const childView = new otype.viewctor!(value, view);
            // childView.$src.setPath(this.property);
            return childView;
        }
        return undefined;
    }

    public assignNewViews(obj: any, view: IViewElement, isRootAssign: boolean) {
        const value = obj[this.property];
        if (value) {
            const otype = this.def.getType(value);
            const childView = new otype.viewctor!(undefined, view);
            (childView as any).$assign(value, isRootAssign);
            childView.$src.setPath(this.property);
            (view as any)[this.property] = childView;
        };
    }


    public readAsViewAsync(obj: any): Promise<any> {
        return Promise.resolve(obj);
    }
}
