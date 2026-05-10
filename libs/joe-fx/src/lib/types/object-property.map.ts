import {
    PropertyTypology,
    AnyDef,
    BaseType,
    IViewElement,
    Property,
    PATH_ROOT,
    MType,
    StringMap,
    ElementTypeBehaviour,
    ValidationState,
    MetadataHelper,
    ListValidationState,
    ValidationScopes,
    asArray,
    isBlank,
    Scalar,
    IMapElementOf
} from '../core';

import {TmapSimpleItem} from './map-item.simple';
import {TmapArrayItem} from './map-item.array';
import {MapViewFactory} from './factory-mview';


/**
 * ──────────────────────────────────────────────────────────────────────────────────
 *                 M A P  -  O B J E C T  -  P R O P E R T Y
 * ──────────────────────────────────────────────────────────────────────────────────
 */
export class TobjectMapProperty implements Property, ElementTypeBehaviour {
    public static Matches(itemSchema: AnyDef): boolean {
        return itemSchema.type === 'map';
    }
    public readonly property: string;
    public readonly kind: PropertyTypology;
    public readonly typology: string | undefined;
    public readonly def: MType;
    public readonly item: AnyDef | BaseType | undefined;
    public readonly required: boolean;

    constructor(property: string, def: MType, required: boolean = true) {
        this.property = property;
        this.required = required;
        this.kind = PropertyTypology.Map;
        this.typology = undefined;
        this.def = def;
        switch (def.itemsTypeDef!.kind) {
            case PropertyTypology.List:
                const arrayItemInfo = def.itemsTypeDef as TmapArrayItem;
                this.typology = arrayItemInfo.item!.title!;
                break;
            case PropertyTypology.Object:
            case PropertyTypology.Scalar:
                const simpleItemInfo = def.itemsTypeDef as TmapSimpleItem;
                this.item = simpleItemInfo.def;
                this.typology = simpleItemInfo.def.title!;
                break;
            default:
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
        if (MetadataHelper.asView(target)) {
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
        const childObj = obj[this.property];
        if (childObj) {
            if (this.kind !== PropertyTypology.Scalar) {
                this.def.prepare(childObj, obj, path);
            }
        }
    }

    public unprepare(obj: any) {
        this.def.unprepare(obj);
    }
    /**
     * Property Read method : It enforces Expando definition on any json object read.
     * Expando will typed
     */
    public readAsView(obj: any, view: IViewElement): any {
        const mapObj = obj[this.property];
        const parentInfo = view.$src;
        const childView =
                this.def.viewctor !== undefined
                    ? new this.def.viewctor(mapObj, view)
                    : MapViewFactory.Create(mapObj, this.def, view);
       
                    childView.$src.setParent(this.property, parentInfo);
        return childView;
       
    }

    public assignView(obj: any, view: IViewElement): any {
        const mapObj = obj[this.property];
        if (mapObj) {
            this.def.prepare(mapObj, obj, this.property);
            const childView =
                this.def.viewctor !== undefined
                    ? new this.def.viewctor(mapObj, view)
                    : MapViewFactory.Create(mapObj, this.def, view);
            // childView.$src.setPath(this.property);
            return childView;
        } else {
            const defaultValue = this.defaultValue();
            // const otype = this.def as MType;
            this.def.prepare(defaultValue, obj, this.property);

            const defaultChildView = MapViewFactory.Create(defaultValue, this.def, view);
            // defaultChildView.$src.setPath(this.property);
            return defaultChildView;
        }
    }

    public assignNewViews(obj: any, view: IViewElement, isRootAssign: boolean) {
        const mapObj = obj[this.property];
        if (!isBlank(mapObj)) {
            const childView = this.def.viewctor !== undefined
                ? new this.def.viewctor(mapObj, view)
                : MapViewFactory.Create(mapObj, this.def, view);
            (childView as unknown as IMapElementOf<Scalar | IViewElement>).$assign(mapObj, isRootAssign);
            (view as any)[this.property] = childView;
        }
    }


}
