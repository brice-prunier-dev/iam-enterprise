import {
    PATH_ROOT,
    IViewElement,
    AnyTypeKey,
    AnyDef,
    BaseType,
    PropertyTypology,
    Property,
    toPropertyTypology,
    OType,
    StringMap,
    ElementTypeBehaviour,
    isBlank,
    MetadataHelper,
    ValidationState,
    ValidationScopes,
    ElementValidationState,
    isArray,
    isViewElement
} from '../core';

/**
 * ──────────────────────────────────────────────────────────────────────────────────
 *                   S I M P L E - O B J E C T - P R O P E R T Y
 * ──────────────────────────────────────────────────────────────────────────────────
 */
export class TobjectSimpleProperty implements Property, ElementTypeBehaviour {
    public readonly def: AnyDef & BaseType;
    public readonly kind: PropertyTypology;
    public readonly property: string;
    // public lookup?: LookupDef;
    public readonly required: boolean;
    public readonly typology: AnyTypeKey;

    constructor(property: string, def: AnyDef & BaseType, required: boolean = true) {
        this.property = property;
        this.required = required;
        this.def = def;
        this.kind = toPropertyTypology(def);
        this.typology = def.type;
    }

    public static Matches(itemSchema: AnyDef): boolean {
        return itemSchema.type !== 'array';
    }

    public defaultValue(): any {
        return this.def.defaultValue();
    }

    public innertype(): BaseType {
        return this.def;
    }

    public prepare(obj: any, parent: any, path: string = PATH_ROOT) {
        const childObj = obj[path];
        if (childObj && this.kind !== PropertyTypology.Scalar) {
            (this.def as OType).prepare(childObj, obj, path);
        }
    }

    public readAsView(obj: any, view: IViewElement): any {
        const value = obj[this.property] ?? this.defaultValue();
        if (this.kind === PropertyTypology.Scalar) {
            return value;
        }
        const otype = this.def as OType;
        otype.prepare(value, obj, this.property);
        const childView = new otype.viewctor!(value, view);
        return childView;
    }

    public assignNewViews(obj: any, view: IViewElement, isRootAssign: boolean) {
        const value = obj[this.property];
        if (isBlank(value)) {
            const otype = this.def as OType;
            const childView = new otype.viewctor!(undefined, view);
            (childView as any).$assign(value, isRootAssign);
            childView.$src.setPath(this.property);
            (view as any)[this.property] = childView;
        }
    }

    public unprepare(obj: any) {
        if (this.kind !== PropertyTypology.Scalar) {
            (this.def as OType).unprepare(obj);
        }
    }

    public validate(state: ValidationState, target: any, scope: ValidationScopes, scopeRef?: any): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;
        const childValidation = this.def.validate(target, childScope);
        state.setItemErrors(scopeRef as string, childValidation.errors);
    }
}
