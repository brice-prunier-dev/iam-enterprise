import {
    PATH_ROOT,
    wrapAsPositionSelector,
    IViewElement,
    PropertyTypology,
    AnyDef,
    BaseType,
    ArrayItemProperty,
    AType,
    isViewElement,
    asArray,
    ValidationState,
    ValidationScopes,
    extractContent,
    Scalar,
    ISetElementOf
} from '../core';
import {TarraySimpleItem} from './array-item.simple';
import {TarrayTupleItem} from './array-item.tuple';
import {ArrayViewFactory} from './factory-aview';

/**
 * Claas that implement ArrayItemProperty for array having array has child item
 */
export class TarrayArrayItem implements ArrayItemProperty {
    // #region Properties

    // In case the child array is a tuple, size is the tuple size.
    readonly size?: number;

    // Child Array type
    readonly def: AType;
    // Item type of the child item
    readonly item: AnyDef | BaseType;
    /**
     * Typology of the child item : @typedef {PropertyTypology} PropertyTypology
     */
    readonly kind: PropertyTypology;
    readonly required: boolean;
    readonly typology: string;

    // #endregion Properties

    // #region Constructors

    constructor(def: AType, required: boolean = true) {
        this.required = required;
        this.kind = PropertyTypology.List;
        this.def = def;
        let item: AnyDef | BaseType;
        switch (def.itemsTypeDef!.kind) {
            case PropertyTypology.List:
                const listTypeDef = def.itemsTypeDef as TarrayArrayItem;
                item = listTypeDef.item;
                this.typology = listTypeDef.item.title;
                this.size = listTypeDef.def.size;
                break;
            case PropertyTypology.Object:
            case PropertyTypology.Scalar:
                const singleTypeDef = def.itemsTypeDef as TarraySimpleItem;
                item = singleTypeDef.def;
                this.typology = singleTypeDef.def.title;
                break;
            default:
                const tupleTypeDefs = def.itemsTypeDef as TarrayTupleItem;
                this.typology = tupleTypeDefs.title;
                this.kind = PropertyTypology.Tuple;
                item = tupleTypeDefs.def[0]!;
                break;
        }
        this.item = item;
    }

    // #endregion Constructors

    // #region Public Accessors

    /**
     * are the items of the inner array any scalar values?
     */
    get hasScalarItem(): boolean {
        return this.kind === PropertyTypology.Scalar;
    }

    // #endregion Public Accessors

    // #region Public Static Methods

    /**
     * Is the the parameter schema an array schema: 
     * as this class is an helper for array of array
     * @param sch item schemas 
     * @returns 
     */
    static Matches(sch: AnyDef): boolean {
        return sch.type === 'array';
    }

    // #endregion Public Static Methods

    // #region Public Methods

    defaultValue(typename?: string | number, asEntity?: boolean): any {
        return this.def.defaultValue();
    }

    innertype(): BaseType {
        return this.item as BaseType;
    }

    /**
     * prepare "metadata info" related to a json node : parent, path & type.
     * @param obj reference to the json node to prepare.
     * @param parent parent iparent json node.
     * @param path relative path from parent.
     */
    prepare(obj: any, parent: any, path: string = PATH_ROOT) {
        if (obj && asArray(obj)) {
            let idx = 0;
            for (const item of obj) {
                (this.def as AType).prepare(item, obj, wrapAsPositionSelector(idx++));
            }
        }
    }

    /**
     * return a setview as child view of the parent "view" for the "obj" array .
     * @param data reference on the array jsonsource
     * @param idx index of the child item,
     * @param parentView reference pn the parent setview
     * @returns
     */
    readAsView(data: any, idx: number, parentView: IViewElement): any {
        // const key = wrapAsPositionSelector(idx);
        // const array = parentView.$src.obj;
        // this.def.prepare(data, array, key);
        // return this.def.viewctor
        // ? new this.def.viewctor(obj, this.def, view)
        // : ArrayViewFactory.Create(obj, this.def, view);

        const array = this.def.withIndex 
            ? ArrayViewFactory.SortFromTypeDef(data, this.def as any)
            : data as [];
        const childArrayView = this.def.viewctor
            ? new this.def.viewctor(data, parentView)
            : ArrayViewFactory.Create(array, this.def, parentView);
        // childArrayView.$src.setPath(key);
        return childArrayView;
    }

    public assignNewViews(obj: any, parentSetView: IViewElement & ISetElementOf<Scalar | IViewElement>, isRootAssign: boolean) {
        const arrayToAssign = obj as (Scalar | IViewElement)[];
        try {
            if (this.hasScalarItem) {
                
                for (let i = 0; i < arrayToAssign.length; i++) {
                    let itemToAssign = arrayToAssign[i];
                    if (itemToAssign === undefined) {
                        itemToAssign = this.def.defaultValue();
                    }
                    parentSetView.add(itemToAssign!);
                }
            } else {
    
                for (let i = 0; i < arrayToAssign.length; i++) {
                    const itemToAssign = arrayToAssign[i];
                    const newChild = parentSetView.$newChild();
                    (newChild as any).$assign(itemToAssign, isRootAssign);
                    parentSetView.add(newChild);
                }
            }
        }
        finally{

        }

       

    }




    unprepare(obj: any) {
        this.def.unprepare(obj);
    }

    validate(state: ValidationState, target: any, scope: ValidationScopes, scopeRef?: any): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;

        const array = target as any[];
        const childTyp = this.def as BaseType;
        switch (scope) {
            case ValidationScopes.Property:
                const newChildIndex = Number.parseInt(extractContent(scopeRef));
                const newChild = array[newChildIndex];
                state.setItemErrors(
                    scopeRef,
                    isViewElement(newChild)
                        ? newChild.validate(ValidationScopes.State).errors
                        : childTyp.validate(newChild, childScope).errors
                );

                break;
            case ValidationScopes.State:
                for (let i = 0; i < array.length; i++) {
                    const child = array[i];
                    if (childTyp.containsScalars) {
                        state.setItemErrors(`[${i}]`, childTyp.validate(child, childScope).errors);
                    } else {
                        state.setItemErrors(
                            `[${i}]`,
                            isViewElement(child)
                                ? child.validate(childScope).errors
                                : childTyp.validate(child, childScope).errors
                        );
                    }
                }
                break;
        }
    }

    // #endregion Public Methods
}
