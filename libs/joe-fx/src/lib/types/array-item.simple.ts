import {
    AnyDef,
    AnyTypeKey,
    ArrayItemProperty,
    BaseType,
    MType,
    OType,
    PropertyTypology,
    toPropertyTypology,
    PATH_ROOT,
    isViewElement,
    asArray,
    wrapAsPositionSelector,
    ValidationState,
    ValidationScopes,
    JsonObj,
    IViewElement,
    AType,
    MetadataHelper,
    decodePositionSelector,
    ListValidationState,
    IndexableType
} from '../core';
import {Tarray} from './array';
import {Tobject} from './object';
import {MapViewFactory} from './factory-mview';


export class TarraySimpleItem implements ArrayItemProperty {
    // #region Properties

    readonly def: AnyDef & BaseType;
    readonly kind: PropertyTypology;
    readonly required: boolean;
    readonly typology: AnyTypeKey;

    // #endregion Properties

    // #region Constructors

    constructor(def: AnyDef & BaseType, required: boolean = true) {
        this.required = required;
        this.def = def as AType;
        this.kind = toPropertyTypology(def);
        this.typology = def.type;
    }

    // #endregion Constructors

    // #region Public Accessors

    get isObject(): boolean {
        return this.kind === PropertyTypology.Object;
    }

    get isScalar(): boolean {
        return this.kind === PropertyTypology.Scalar;
    }

    // #endregion Public Accessors

    // #region Public Static Methods

    static Matches(sch: AnyDef): boolean {
        return sch.type !== 'array';
    }

    // #endregion Public Static Methods

    // #region Public Methods

    defaultValue(typename?: string | number, asEntity?: boolean): any {
        switch (this.kind) {
            case PropertyTypology.Map:
                const kl = {};
                return asEntity ? MapViewFactory.Create(kl, this.def as MType) : kl;

            case PropertyTypology.Object:
                const otype = this.def as OType;
                const obj = this.def.defaultValue();

                if (asEntity && !otype.viewctor) {
                    throw new Error(`${otype.title} has no view configured!`);
                }
                return asEntity ? new otype.viewctor!(obj) : obj;

            default:
                return this.def.defaultValue();
        }
    }

    innertype(): BaseType {
        return this.def;
    }

    prepare(obj: any, parent: any, path: string = PATH_ROOT) {
        if (obj && asArray(obj)) {
            let idx = 0;
            for (const item of obj) {
                (this.def as OType).prepare(item, obj, wrapAsPositionSelector(idx++));
            }
        }
    }

    assignNewViews(obj: any, view: IViewElement, isRootAssign: boolean): void {

    }

    readAsView(obj: any, idx: number, setview: any): any {
        if (this.isScalar) {
            return obj;
        }
        const otype = this.def as OType;
        if (obj) {
            if (this.isObject) {
               
                if (otype.viewctor === undefined) {
                    throw new Error(`${otype.title} has no view configured!`);
                }
               

                const childView = new otype.viewctor(obj, setview);
                
                return childView;
            }
        }
        return undefined;
    }

    unprepare(obj: any) {
        switch (this.kind) {
            case PropertyTypology.Tuple:
            case PropertyTypology.List:
                (this.def as Tarray).unprepare(obj);
                break;
            case PropertyTypology.Object:
                (this.def as OType).unprepare(obj);
                break;
            case PropertyTypology.Map:
                (this.def as MType).unprepare(obj);
                break;
            default:
                return;
        }
    }

    validate(state: ValidationState, target: unknown, scope: ValidationScopes, scopeRef?: unknown): void {
        const childScope =
            scope === ValidationScopes.EnforceState
                ? ValidationScopes.EnforceState
                : ValidationScopes.State;

        const array = target as any[];
        const withIndexCheck = (this.def as unknown as IndexableType).withIndex;
           
        switch (scope) {
           case ValidationScopes.Property:     
                if (withIndexCheck) { 
                    const twin = array.filter(
                        (o: IViewElement, idx: number) => scopeRef === MetadataHelper.getTypeInfo(o)!.path
                    );
                    if (twin && twin.length > 1) {
                        state.setItemErrors('_', {
                            _lstIndex: {index: scopeRef}
                        } as JsonObj);
                    }
                } else {
                    const addStartndex =  decodePositionSelector( scopeRef );
                    
                    array.forEach((item, idx) => {

                        if( idx >= addStartndex){
                            state.setItemErrors(
                                `[${idx}]`,
                                this.def.validate(array[idx], ValidationScopes.State).result());
                         
                        }
                    });
                
                } 
                break;

            
        
            default :
                
                if(!(state as ListValidationState).initialized ) {
                
                    const containsScalars = this.def.containsScalars;
                    const withIndex = containsScalars 
                                ? false
                                : (this.def as Tobject).withIndex;

       
                    for (let i = 0; i < array.length; i++) {
                        const child = array[i];
                        if (containsScalars) {
                            state.setItemErrors(`[${i}]!`, this.def.validate(child, childScope).errors);
                        } else {
                            const indexPath = withIndex
                                                ? (this.def as Tobject).getIndexPath(child)
                                                : `[${i}]`;
        
                            state.setItemErrors(
                                indexPath,
                                isViewElement(child)
                                    ? child.validate(childScope).errors
                                    : this.def.validate(child, childScope).errors
                            );
                        }
                    }
                    (state as ListValidationState).initialized = true;
                }
                break;
            
        }
    }

    // #endregion Public Methods
}
