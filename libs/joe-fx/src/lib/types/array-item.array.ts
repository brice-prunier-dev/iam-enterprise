import {
    
    wrapAsPositionSelector,
    IViewElement,
    PropertyTypology,
    AnyDef,
    BaseType,
    ArrayItemProperty,
    AType,
    asViewElement,
    asArray,
    ValidationState,
    ValidationScopes,
    extractContent,
    Scalar,
    ISetElementOf,
    JsObject
} from '../core';
import {TarraySimpleItem} from './array-item.simple';
import {TarrayTupleItem} from './array-item.tuple';
import {ArrayViewFactory} from './factory-aview';
import { Tobject } from './object';

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

    constructor(def: AType, required = true) {
        this.required = required;
        this.kind = PropertyTypology.List;
        this.def = def;
        let item: AnyDef | BaseType;
        switch (def.itemsTypeDef?.kind) {
            case PropertyTypology.List: {
                const listTypeDef = def.itemsTypeDef as TarrayArrayItem;
                item = listTypeDef.item;
                this.typology = listTypeDef.item.title;
                this.size = listTypeDef.def.size;
                break;
            }
            case PropertyTypology.Object:
            case PropertyTypology.Scalar: {
                const singleTypeDef = def.itemsTypeDef as TarraySimpleItem;
                item = singleTypeDef.def;
                this.typology = singleTypeDef.def.title;
                break;
            }
            default: {
                const tupleTypeDefs = def.itemsTypeDef as TarrayTupleItem;
                this.typology = tupleTypeDefs.title;
                this.kind = PropertyTypology.Tuple;
                item = tupleTypeDefs.def[0];
                break;
            }
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

    defaultValue(): unknown {
        return this.def.defaultValue();
    }

    innertype(): BaseType {
        return this.item as BaseType;
    }

    /**
     * prepare "metadata info" related to a json node : parent, path & type.
     * @param array reference to the json node to prepare.
     * @param parent parent iparent json node.
     * @param path relative path from parent.
     */
    prepare(instance: unknown) {
        const array = instance as unknown[];
        if (array && asArray(array) && !this.def.containsScalars) {
            let idx = 0;
            for (const item of array) {
                (this.def as AType).prepare(item as JsObject, instance as JsObject, wrapAsPositionSelector(idx++));
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
    readAsView(data: unknown, idx: number, parentView: IViewElement): IViewElement {
        // const key = wrapAsPositionSelector(idx);
        // const array = parentView.$src.obj;
        // this.def.prepare(data, array, key);
        // return this.def.viewctor
        // ? new this.def.viewctor(obj, this.def, view)
        // : ArrayViewFactory.Create(obj, this.def, view);
        const instance = data as unknown[];
        const array = this.def.withIndex 
            ? ArrayViewFactory.SortFromTypeDef(instance, this.item as Tobject<unknown>)
            : data as [];
        const childArrayView = this.def.viewctor
            ? new this.def.viewctor(instance, parentView)
            : ArrayViewFactory.Create(array, this.def, parentView);
        // childArrayView.$src.setPath(key);
        return childArrayView;
    }

    public assignNewViews(obj: unknown, parentSetView: IViewElement & ISetElementOf<Scalar | IViewElement>, isRootAssign: boolean) {
        const arrayToAssign = obj as (Scalar | IViewElement)[];
    
            if (this.hasScalarItem) {
                
                for (let i = 0; i < arrayToAssign.length; i++) {
                    let itemToAssign = arrayToAssign[i];
                    if (itemToAssign === undefined) {
                        itemToAssign = this.def.defaultValue() as Scalar | IViewElement;
                    }
                    parentSetView.add(itemToAssign);
                }
            } else {
    
                for (let i = 0; i < arrayToAssign.length; i++) {
                    const itemToAssign = arrayToAssign[i];
                    const newChild = parentSetView.$newChild();
                    newChild.$assign(itemToAssign, isRootAssign);
                    parentSetView.add(newChild);
                }
            }      

    }




    unprepare(obj: JsObject) {
        this.def.unprepare(obj);
    }

    validate(state: ValidationState, target: unknown, scope: ValidationScopes, scopeRef?:  string | IViewElement): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;

        const array = target as unknown[];
        const childArrayType = this.def as BaseType;
        switch (scope) {
            case ValidationScopes.Property: {
                const childIndex = Number.parseInt(extractContent(scopeRef as string));
                const propertyArray = array[childIndex];
                const propertyArrayElement = propertyArray as JsObject;
                const property = scopeRef as string;
                if( asViewElement(propertyArrayElement) ) {

                   state.setItemErrors( 
                        property,
                        propertyArrayElement.validate(ValidationScopes.State).errors);
                } else {
                       state.setItemErrors( 
                            property,
                            childArrayType.validate(propertyArray, childScope).errors);
                 }   

                break;
            }
            case ValidationScopes.State: {
                for (let i = 0; i < array.length; i++) {
                    const child = array[i];
                    const childElement = child as JsObject;
                    if (childArrayType.containsScalars) {
                        state.setItemErrors(`[${i}]`, childArrayType.validate(child, childScope).errors);
                    } else {
                        if( asViewElement(childElement) ) {

                            state.setItemErrors( 
                                    `[${i}]`,
                                    childElement.validate(ValidationScopes.State).errors);
                        } else {
                            state.setItemErrors( 
                                        `[${i}]`,
                                        childArrayType.validate(child, childScope).errors);
                        }   

                    }
                }
                break;
            }
        }
    }

    // #endregion Public Methods
}
