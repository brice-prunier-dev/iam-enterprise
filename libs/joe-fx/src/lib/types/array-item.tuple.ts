git import {
    MetadataHelper,
    IViewElement,
    isArray,
    PATH_ROOT,
    wrapAsPositionSelector,
    AType,
    AnyDef,
    ArrayItemProperty,
    ArrayDef,
    BaseType,
    MType,
    OType,
    PropertyTypology,
    toPropertyTypology,
    isViewElement,
    ValidationState,
    ValidationScopes,
    extractContent
} from '../core';
import {TypeFactory} from './factory-type';
import {ArrayViewFactory} from './factory-aview';
import {MapViewFactory} from './factory-mview';

export class TarrayTupleItem implements ArrayItemProperty {
    // #region Properties

    private _parentArray: AType;

    readonly def: Array<AnyDef & BaseType>;
    readonly kind: PropertyTypology;
    readonly required: boolean;
    readonly title: string;
    readonly typology: PropertyTypology;

    // #endregion Properties

    // #region Constructors

    constructor(array: AType, required: boolean = true, title?: string) {
        this.required = required;
        this._parentArray = array;
        const schList = array.items as AnyDef[];
        this.def = schList.map((s) => TypeFactory.TYPEDEF(s));
        this.kind = PropertyTypology.Tuple;
        let typology = PropertyTypology.Scalar;
        this.def.forEach((val, idx, lst) => {
            const schTypo = toPropertyTypology(val);
            if (idx === 0) {
                typology = schTypo;
            } else if (typology !== schTypo) {
                typology = PropertyTypology.Tuple;
            }
        });
        this.typology = typology;
        this.title = title || JSON.stringify(this.def.map((s) => s.title));
    }

    // #endregion Constructors

    // #region Public Static Methods

    static Matches(sch: AnyDef[], opt: ArrayDef): boolean {
        if (isArray(sch) && opt.minlength === opt.maxlength) {
            const itemsch = sch as ArrayDef[];
            return opt.minlength === itemsch.length;
        }
        return false;
    }

    // #endregion Public Static Methods

    // #region Public Methods

    defaultValue(typename?: string | number, asEntity?: boolean): any {
        const tuple = this.def.map((sch) => sch as BaseType).map((t) => t.defaultValue());
        MetadataHelper.unsureTypeInfo(tuple, this._parentArray);
        return tuple;
    }

    prepare(obj: any, parent: any, path: string = PATH_ROOT) {
        if (obj && isArray(obj)) {
            let idx = 0;
            for (const item of obj) {
                if ((this.def[idx] as AType).prepare) {
                    (this.def[idx] as AType).prepare(item, obj, wrapAsPositionSelector(idx));
                }
                idx++;
            }
        }
    }
    assignNewViews(obj: any, view: IViewElement, isRootAssign: boolean): void {

    }


    readAsView(obj: any, idx: number, view: IViewElement): any {
        const segmentType = this.def[idx]!;
        const child = obj[idx];
        if (child) {
            if (segmentType.type === 'object') {
                const key = `[${idx}]`;
                const def = segmentType as MType | OType | AType;
                def.prepare(obj, view.$src.obj, key);
                switch (def.type) {
                    case 'object':
                        const otype = def as OType;
                        if (otype.viewctor === undefined) {
                            throw new Error(`${otype.title} has no view configured!`);
                        }
                        // return new otype.viewctor(obj, view);

                        const childView = new otype.viewctor(obj, view);
                        // childView.$src.setPath(key);
                        return childView;

                    case 'array':
                        const atype = def as AType;
                        // return atype.viewctor
                        //     ? new atype.viewctor(obj as any[], atype, view)
                        //     : ArrayViewFactory.Create(obj as any[], atype, view);

                        const childArrayView = atype.viewctor
                            ? new atype.viewctor(obj as any[], atype, view)
                            : ArrayViewFactory.Create(obj as any[], atype, view);
                        // childArrayView.$src.setPath(key);
                        return childArrayView;

                    default:
                        const mtype = def as MType;
                        // return MapViewFactory.Create(obj, mtype, view);
                        const mapChildView = MapViewFactory.Create(obj, mtype, view);
                        // mapChildView.$src.setPath(key);
                        return mapChildView;
                }
            }
        }
        return child;
    }

    unprepare(obj: any) {
        if (obj) {
            if (isArray(obj)) {
                const tuple = obj as any[];
                for (let i = 0; i < tuple.length; i++) {
                    const slotTyp = this.def[i] as any;
                    if (slotTyp.unprepare) {
                        slotTyp.unprepare(tuple[i]);
                    }
                }
            }
        }
    }

    validate(state: ValidationState, target: any, scope: ValidationScopes, scopeRef?: any): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;

        const tuple = target as any[];
        const childIndex = Number.parseInt(extractContent(scopeRef ?? '0'));
        const child = tuple[childIndex];

        switch (scope) {
            case ValidationScopes.Property:
                state.setItemErrors(
                    scopeRef as string,
                    isViewElement(child)
                        ? child.validate(ValidationScopes.State).errors
                        : this.def[childIndex]!.validate(child, childScope).errors
                );
                break;

            case ValidationScopes.State:
                for (let i = 0; i < tuple.length; i++) {
                    const slot = tuple[i];
                    const slotTyp = this.def[i] as BaseType;
                    if (['string', 'number', 'boolean', 'date'].includes(slotTyp.type)) {
                        state.setItemErrors(`[${i}]`, slotTyp.validate(slot, childScope).errors);
                    } else {
                        state.setItemErrors(
                            `[${i}]`,
                            isViewElement(slot)
                                ? slot.validate(childScope).errors
                                : slotTyp.validate(slot, childScope).errors
                        );
                    }
                }
                break;
        }
    }

    // #endregion Public Methods
}
