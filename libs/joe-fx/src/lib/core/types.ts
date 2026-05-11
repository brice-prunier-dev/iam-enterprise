
import {
    EStateChanges,
    DataAction,
    ElementMessageType,
    ElementNotifications,
    ModelNotifications,
    PropertyTypology,
    ValidationScopes,
} from './enums';


export type Subscription = {
  closed: boolean;
  unsubscribe(): void;
  add(teardown: Subscription | (() => void)): void;
  remove(teardown: Subscription | (() => void)): void;
}


export type Observer<T> {
  next: (value: T) => void;
  error: (err: any) => void;
  complete: () => void;
}

export type Observable<T> = {
  subscribe(
    observer: Partial<Observer<T>> | ((value: T) => void)
  ): Subscription;
}

export type JsObject =  Record<PropertyKey, unknown> 

export type AnyDef = ScalarDef | ElementDef;
export type AnyTypeKey = ScalarTypeKey | ReferenceTypeKey;
export type ArrayTypeConstructor = new (sch: ArrayDef) => AType;
/**
 * Collection of  {@Link ChangeItem | Change Items}.
 * 
 * A ChangeSet is a JSON instance that list all the modifications applieds on aView.
 */
export type ChangeSet = ChangeItem[];
export type DateAccessor = (o?: unknown) => Date;
export type DateListAccessor = (o?: unknown) => Date[];
export type ElementDef = ArrayDef | ObjectDef | MapDef | XObjectDef;
export type ElementEvent = {
    type: ElementNotifications | ModelNotifications,
    source?: unknown
};
export type Json = string | number | boolean | null | undefined | {[property: string]: Json} | Json[];
export type JsonObj = {[property: string]: Json};
export type JsonDoc = {[property: string]: Json} | Json[];
export const JSON_NULL: JsonDoc = {};
export type JsonScalar = string | number | boolean;
export type MapTypeConstructor = new (sch: MapDef) => MType;
export type MapviewConstructor = new (data?: unknown, parent?: unknown, superType?: unknown) => IViewElement;
export type Mutable<T> = {value: T};
export type NotificationPayload = {
    message: string,
    action: string
};
export type NumberAccessor = (o?: unknown) => number;
export type NumberListAccessor = (o?: unknown) => number[];
export type ObjectTypeConstructor<T = unknown> = new (options: ObjectDef<T>, name?: string) => OType<T>;
export type ObjviewConstructor = new (data?: unknown, parent?: unknown, superType?: unknown) => IViewElement;
/**
 * Make all properties in T optional
 */
export type PartialData<T> = {
    [P in keyof T]?: (T[P] extends object ? PartialData<T[P]> : T[P])
};

export type PartialPropertiesDef<T> = {[P in keyof T]?: PropertyDef};
export type Properties<T> = {[K in keyof T]: Property};
export type PropertiesDef<T> = {[P in keyof T]: PropertyDef};
export type PropertiesInfo = StringMap<Property>;
/**
 * 
 */
export type PropertyDef = AnyDef;
export type ReferenceTypeKey = 'object' | 'array' | 'map' | 'xobject';
export type Scalar = string | number | boolean;
export type ScalarDef = StringDef | NumberDef | BooleanDef;
export type ScalarObj = string | number | boolean | Date;
export type ScalarTypeKey = 'string' | 'number' | 'boolean';
export type SetviewConstructor = new (data?: unknown[], parent?: IViewElement, superType?: any) => IViewElement;
export type SortComparer = (a: unknown, b: unknown) => number;
export type StringAccessor = (o?: unknown) => string | null;
export type StringListAccessor = (o?: unknown) => string[];
export type XObjectTypeConstructor<T = unknown> = new (
    options: XObjectDef<T>,
    name?: string
) => XType<T>;

export type AType = ArrayDef & BaseElementType & IndexableType & {
    isMultiDimension: boolean;
    isTuple: boolean;
    itemsTypeDef?: ArrayItemProperty;
    size: number;
    type: 'array';
    viewctor?: SetviewConstructor;

    fillValidationSummary(
        objErrors: StringMap,
        summary: IRuntimeSummary,
        path: string
    ): IRuntimeSummary;
}

/**
 * Array Type definition (complies with Json Schema)
 */
export interface ArrayDef<T = AnyDef | AnyDef[]> {
    items: T;
    maxlength: number;
    minlength: number;
    title: string;
    type: 'array';
}

export type ArrayItemProperty = BaseProperty & ElementTypeBehaviour &  {
    
    def: (AnyDef & BaseType) | Array<AnyDef & BaseType>;

    assignNewViews(obj: unknown, view: IViewElement, isRootAssign: boolean): void;
    defaultValue(typename?: string | number, asEntity?: boolean): any;
    readAsView(obj: unknown, idx: number, parentView: IViewElement): any;

    // getIndexPath(i: number, item: any): string;
}

export type  BaseElementType =  BaseType & ElementTypeBehaviour;

export type  BaseProperty = {
    kind: PropertyTypology;

    defaultValue(): unknown;
    validate(state: ValidationState, target: unknown, scope: ValidationScopes, scopeRef?: string | IViewElement): void;
}

/**
 * Basic Json Type info: type, title (aka name) 
 * plus an isScalar getter as helper
 * ```ts
 * {
 *  type: AnyTypeKey;
 *  title: string;
 *  get isScalar()
 *  ...
 *  validate(target, action, scope?, result ): ValidationResult;
 *  defaultValue(): any;
 * }
  * ```
 */
export type BaseType = BaseTypeBehaviour & {
    readonly type: AnyTypeKey;
    containsScalars: boolean;
    title: string;
}

/**
 * Core type behaviour: validation & default value.
 * ```ts
 * {
 *  validate(target, action, scope?, result ): ValidationResult;
 *  defaultValue(): any;
 * }
 * ```
 */
export type BaseTypeBehaviour = {
    defaultValue(): unknown;
    validate(target: unknown, scope: ValidationScopes, scopeRef?: string | IViewElement): ValidationState;
}

export interface BooleanDef {
    default: boolean;
    title: string;
    type: 'boolean';
}

/**
 * Data modification definition.
 * 
 * - op:  What changes, 
 * 
 * - path: On what intance of the View hierarchy,
 * 
 * - selector: On what property name or collection index,
 * 
 * - obj: new value -> it can be a simple scalar or a plain JSON object.
 */
export type ChangeItem = {
    /**
     * Type of the modified instance.
     */
    $type?: string;
    /**
     * Type of modification.
     */
    op: EStateChanges;
    /**
     * Path to the modified instance.
     */
    path: string;
    /**
     * property name or collection index
     */
    selector: string | undefined;
    /**
     * Type of the modified instance.
     */
    type: string;
    /**
     * can be a simple scalar or a plain JSON object.
     */
    value: unknown;
}

/**
 * Payload relative to a data modification.
 * 
 * - action: {@Link enums#DataAction | type of changes}, 
 * 
 * - sourcePath: view path,
 * 
 * - dataPath: property name,
 * 
 * - dataInfo: optional extra info.
 */
export type DataPayload =  {
    action: DataAction;
    dataInfo?: string;
    dataPath: string;
    sourcePath: string;
}

/**
 * Specialized collection modification cache:
 */
export interface EditCache<T> {
    deleted: T;
    inserted: T;
    modified: T;
}

export type ElementTypeBehaviour = {
    prepare(obj: JsObject, parent?: JsObject, path?: string ): void;
    unprepare(obj: JsObject): void;
}

/**
 * Type Metadata & Hierarchy Metadata related to an Element
 */
export type IDataInfo<T = unknown> = {
    attached: boolean;
    detached: boolean;
    docPath: string;
    isArray: boolean;
    isMap: boolean;
    isObject: boolean;
    isRoot: boolean;
    obj: T;
    parent: IDataInfo;
    path: string;
    type: AType | OType | MType;
    viewmodel?: IElementContext;

    keyIndex(key: unknown): string;
    parentRelativePathInfo(): [string, string | undefined];
    release(): void;
    root(): IDataInfo;
    setParent(path: string, parent: IDataInfo): void;
    setParentChildView(obj: IViewElement, path: string): void;
    setPath(path: string): void;
    unsetParent(): void;
    write(property: PropertyKey, value: unknown): void;
}

/**
 * Editor interface is shared by the tree kind of view editor: 
 * 
 * - ObjviewEditor, 
 * 
 * - SetviewEditor
 * 
 * - MapviewEditor.
 * 
 * A view editor is created for each View switching to "Edit" mode:
 * 
 * - It manages the editing session of a view
 */
export interface IEditor {
    /**
     * This method applies the changes describes as input.
     *
     * @param changeset is a collection of {@link ChangeItem | Change Items}.
     */
    applyChangeSet(changeset: ChangeSet): void;
    /**
     * This method cancel an editing session.
     * By calling "cancelEdit()" the changeset handle by the view is destroy an the view re read its properties from the source JSON instance.
     * 
     * @param fromParent (default value is false): when fromParent is false the "cancelEdit" call is re applied to the root element to go down the view hierarchy with the parameter "fromParent" equals to "true".
     * 
     */
    cancelEdit(localBranch?: boolean, raiseNotif?: boolean): void;
    /**
     * This method terminate an editing session.
     * By calling "endEdit()" the changeset handle by the view is applied to the source JSON instance.
     * 
     * @param localBranch (default value is false): when localBranch is false the "endEdit" call is re applied to the root element to go down the view hierarchy with the parameter "fromParent" equals to "true".
     * @param raiseNotif (default value is false): when raiseNotif is false no notification is raised. This is done to avoid multiple notification when the "endEdit" is called from the root element.
     */
    endEdit(localBranch?: boolean, raiseNotif?: boolean): void;
    /**
     * method to evaluate if the view or one of its property has been modified.
     * 
     * @param property (default value is "*"): 
     * 
     * - "*" test if the view has at least one property modified.
     * 
     * - test if the input "property" name is modofied.
     * 
     */
    isDirty(property?: string): boolean;
    /**
     * Is the linked view unchanged
     */
    isPristine(): boolean;
    /**
     * A view can be an hiearchy of view elements.
     * Is dirty evaluates if the current view or any child view element is modified.
     */
    isTouched(): boolean;
    /**
     * This method writes all the current view changes into the input changeSet instance.
     *
     * @param changeset ChangeSet is a container of change operations. 
     */
    writeChangeSet(changeset: ChangeSet, path?: [string, string]): void;
}

/**
 * Element context that accept Element event notification
 */
export interface IElementContext<V = unknown> {
    modelS: Signal<Mutable<V>>;

    notifyChanges(event: ElementEvent): void;
}

/**
 * Message issued from an model Element.
 */
export interface IElementMessage {
    /**
     * Message  content
     */
    get msg(): string;
    /**
     * path of the issuer
     */
    get path(): string;
    get qualier(): string;
    /**
     * {@link Type | ElementMessageType} of the message.
     */
    get type(): ElementMessageType;
}

export type IMapElementOf<T extends Scalar | IViewElement> = {
    $assign(value: Record<string, PartialData<T>>, isRootAssign: boolean): IMapElementOf<T>;
    $newChild<Ta extends IViewElement>(): Ta;
    $refresh(data: Record<string, T>): void;
    $refreshChild(property: string, data: T): void;
    get(key: string): T;
    set(key: string, view: T | undefined): IMapElementOf<T>;
}

export type IObjElementOf<T = unknown> = {
    $assign(value: PartialData<T> | PartialData<Array<T>>, isRootAssign: boolean): IObjElementOf<T>;
    $newChild<U extends IViewElement>(childType: ObjviewConstructor): U;
    $refresh(data: T): void;
    $refreshChild(property: string, data: unknown): void;
}

export interface IRuntimeSummary {
    get hasMessages(): boolean;
    get isValid(): boolean;
    get messages(): IElementMessage[];

    clear(): IRuntimeSummary;
    push(msg: IElementMessage): IRuntimeSummary;
}

export interface ISetElementOf<T extends Scalar | IViewElement> extends Iterable<T> {
    $canSave: boolean;
    $containsScalars: boolean;
    length: number;

    $assign(value: PartialData<T>[], isRootAssign: boolean): this;
    $indexOfPath(path: string): number;
    $newChild<Ta extends IViewElement>(initData?: any): Ta;
    $refresh(data: T[]): void;
    $refreshChild(property: string, data: T): void;
    // $newChild(input: T, index: number): this;
    add(input: T, index?: number): void;
    remove(input: T): void;
    removeAt(index: number): void;
}

/**
 * Core properties shared b any View element knowing a View Element is 
 * 
 * - either an Objview ( a view over a stantard JSON object)
 * 
 * - or a Setview (a view over a JSON array)
 * 
 * - or a Mapview { a view over a JSON object used as dictionnary}
 */
export type IViewElement = JsObject & {
    $canSave: boolean;
    /**
     * Editor instantiated when the view is in an editing mode
     */
    $editor?: IEditor;
    $isEditing: boolean;
    $src: IDataInfo;
    /**
     * Property indicating is validation & notification should be done.
     */
    $tracking: boolean;
    /**
     * View {@Link core#validations#ValidationState | Validation Map} that publish existing validation error.
     *  ValidationState is a map of error map:
     *  - fisrt map key target either current view or current view property:
     *  
     *  - '_' (underscore) property is the key for current view e
     * 
     * 
     */
    $validation: ValidationState;
    onViewChanged?: Observable<DataPayload>;

    $asString(): string;
    $children(): StringMap<IViewElement> | IViewElement[] | undefined;
    $edit(forceTracking?: boolean, doNotification?: boolean): IEditor;
    $endEdit(local?: boolean, raiseNotif?: boolean): void;
    $isRoot(): boolean;
    $json(): JsonDoc;
    $notify(event: ElementNotifications): void;
    /**
     * Helper method that return the parent element.
     * 
     * @remark When the current instance is the root element it returns itself.
     * @returns parent element or itself when root.
     */
    $parent(): IViewElement;
    $release(): void;
    $root(): IViewElement;
    /**
     * Check the validity of the current instance over its `Type Model'.
     * 
     * @remark `Type Model` validity rely on a 3 steps validation:
     * 
     * 1- Type validation
     * 
     * 2- Rules validation (when step 1 is valid)
     * 
     * 3- Async rules validations (when step 2 is valid)
     * 
     * As the validation state is statefull a single full validation is required.
     * 
     * Only partial validation related to the changing property are applied then
     * @param scope {@Link core#enums#ValidationScopes | Validation scope allow to limit the validation scope},
     * @param scopeRef (optional) extra parameter required by validation scope (Ex. the property name when scope is ValidationScopes.Property)
     * @returns undefined when ok other why a map of the property in error {@Link core#validations#ValidationState | Validation Map},
    */
    validate(scope: ValidationScopes.State ): ValidationState;
    validate(scope: ValidationScopes.EnforceState ): ValidationState;
    validate(scope: ValidationScopes.Property, scopeRef: string): ValidationState;
    validate(scope: ValidationScopes.AddChild, scopeRef: IViewElement | JsObject): ValidationState;
    validate(scope: ValidationScopes.RemoveChild): ValidationState;
    validate(scope: ValidationScopes.Rule, scopeRef:  IViewElement | JsObject): ValidationState;
}

/**
 * Index property definition for an  {@link Element Type Model \ ObjectDef} 
 */
export type IndexDef = {
    id: string | string[];
    rev?: string;
    sort?: string | string[];
}

/**
 * Common properties for a type having an index
 */
export type IndexableType = {
    /**
     * Flag to indicate the index property is set
     */
    withIndex: boolean;

    /**
     * return the index object
     * @example
     * index definition is { id: 'id'}
     * input `keyDef` is 5
     * return will be { id: 5 };
     * @param keyDef values matching the index definition
     */
    buildIndexObjFromSelectorValue(keyDef: string | number | (string | number)[]): object;
    /**
     * return the path segment that identifies `obj`. 
     * @example
     * index definition is { id: 'id'}
     * input obj is { id: 5, name: 'Jhon Doe'}
     * return will be '[5]' };
     * @param obj reference the index path shoud identify,
     * @param index: default position index as fallback.
     */
    getIndexPath(obj: JsObject): string;
    /**
     * return the index values for an element (null if none)
     * @example
     * index definition is { id: 'id'}
     * input obj is { id: 5, name: 'Jhon Doe'}
     * return will be 5;
     * @param keyDef values matching the index definition
     */
    getIndexValue(obj: object): null | string | number | (string | number)[];
}

export interface MType extends MapDef, BaseElementType {
    isMultiDimension: boolean;
    isTuple: boolean;
    itemsTypeDef?: MapProperty;
    size: number;
    type: 'map';
    viewctor?: MapviewConstructor;

    fillValidationSummary(
        objErrors: StringMap,
        summary: IRuntimeSummary,
        path: string
    ): IRuntimeSummary;
}

/**
 * Map Type definition (no mapping in Json Schema)
 */
export type MapDef = {
    items: AnyDef | AnyDef[];
    key: StringDef | NumberDef;
    maxlength: number;
    minlength: number;
    title: string;
    type: 'map';
}

export type MapProperty = BaseProperty & ElementTypeBehaviour &  {
    def: (AnyDef & BaseType) | Array<AnyDef & BaseType>;

    defaultValue(typename?: string | number, asEntity?: boolean): any;
    readAsView(obj: any, idx: string, parentView: IViewElement): any;
}

export type NumberDef = {
    default?: number | NumberAccessor;
    maxexclusive?: number;
    maximum?: number;
    minexclusive?: number;
    minimum?: number;
    pattern: string;
    title: string;
    type: 'number';
}

export interface OType<T = any> extends ObjectDef<T>, BaseElementType, IndexableType {
    allProperties: PropertiesInfo;
    index?: IndexDef;
    type: 'object';
    viewctor?: ObjviewConstructor;

    fillValidationSummary(
        objErrors: StringMap,
        summary: IRuntimeSummary,
        path: string
    ): IRuntimeSummary;
    getIndexObjFromValue(obj: any | any[]): JsonObj;
    validateAsync(target: any, scope: ValidationScopes, scopeRef?: any): void;
}

/**
 * 
 */
export interface ObjectDef<T = any> {
    extends?: ObjectDef[];
    index?: IndexDef;
    properties: PartialPropertiesDef<T>;
    required: (keyof T)[];
    title: string;
    type: 'object';
}

// export const LOCAL_PROPERTY: BaseProperty = {
//     kind: PropertyTypology.Object,
//     defaultValue: () => undefined,
//     validate: (target: any, scope?: string | object | boolean) => void
// };
export interface Property extends BaseProperty {
    required: boolean;

    assignNewViews(obj: any, view: IViewElement, isRootAssign: boolean): void;
    defaultValue(asEntity?: boolean): any;
    readAsView(obj: any, parentView: IViewElement): any;
}

export interface ScalarProperty extends Property {
    lookupClientName?: string;
}

/**
 * String Type definition (complies with Json Schema)
 */
export interface StringDef {
    readonly default?: string | StringAccessor;
    readonly enum?: readonly string[];
    readonly maxlength?: number;
    readonly minlength?: number;
    readonly pattern?: string;
    readonly patternModel?: string;
    readonly type: 'string';

    title: string;
}

export interface StringMap<T = any> {
    [x: string]: T;
}

export interface TupleDef<T = AnyDef[]> extends ArrayDef<T> {
    index?: IndexDef;
}

/**
 * ValidationState interface enfoce a dictionary of validation errors with specialized behaviours to manage it.
* 
*  It is a map of error map:
*  
*  Fisrt map keys target are either current view or a view property:
*  
*  - '_' (underscore) is the key that target the current view 
* 
*  - other while the key will be the view property name. 
*  
*  @remark 
*  Second map keys are `error identifier` where the value is.are the error parameter.s .
*
*  NB: Foreach `error identifier` a {@Link RuntimeMessage.html#endEdit | RuntimeMessage registration} shoud be done to spare for a specific `error identifier` a function that can turn error parameters into a human readble message.   
* 
* @example
* ```ts
 * {
 *   _: { ruleKey: refValue },
 *   propertyA: {
 *          _required: {required: true},
 *       },
 *   propertyB: {
 *          _strMinlength: {minlength: 3, actualLength: 1},
 *          _strPattern: {model: 'token'}
 *       },
 * }
 * ```
*/
export interface ValidationState<T = unknown> {
    /**
     * Errors Map
     */
    errors: JsonObj;

    /**
     * If `errorKey` exists all `errorKey` instance properties are removed
     */
    clear(all?: 'all' | '_' | 'items'): void;
    /**
     * Current validation state is valid.
     */
    isValid(property?: keyof T): boolean;
    /**
     * Return the validation state if exists any valid error otherwhy unassigned.
     */
    result(): JsonObj | undefined;
    /**
     * `errorKey` is cleared when arg is undefined other why the entry is set. 
     * @param errorKey:  
     * @param arg Error definition
     */
    setItemErrors(errorKey: string, arg: JsonObj | undefined): void;
    /**
     * Current validation state is null or empty or just has Required constraint.
     */
    unassigned(): boolean
    /**
     * Current validation state is not valid.
     */
    withError(): boolean;
}

export interface XObjectDef<T = unknown> {
    anyOf: OType[];
    index?: IndexDef;
    title: string;
    type: 'xobject';

    getIndexObjFromValue(obj: unknown | unknown[]): JsonObj;
    getType(obj: object): OType<T>;
}

export type XType<T = unknown> = XObjectDef<T> & BaseElementType & IndexableType &  {
    type: 'xobject';

    validateAsync(target: unknown, scope: ValidationScopes, scopeRef?: unknown): void;
    viewctor(obj: unknown): ObjviewConstructor;
}

export function EVENT_CustomOperation(source?: unknown): ElementEvent {
    return {
        type: ModelNotifications.custom,
        source
    };
}

export function EVENT_DataChanged(source: unknown): ElementEvent {
    return {
        type: ModelNotifications.dataChanged,
        source
    };
}

export function EVENT_StartOperation(source?: unknown): ElementEvent {
    return {
        type: ModelNotifications.startOfOperation,
        source
    };
}

export const EVENT_END_OPERATION = {
    type: ModelNotifications.endOfOperation
} satisfies ElementEvent;
/**
 *
 */
export const NULL_ValidationState: ValidationState = {
    errors: {},
    setItemErrors(propName: string, result: JsonObj | undefined): void {
        return;
    },
    clear() {
        return;
    },
    unassigned() {
        return true;
    },
    withError() {
        return false;
    },
    isValid() {
        return true;
    },
    result() {
        return undefined;
    }
};


export type Signal<T> = () => T;
export type WritableSignal<T> = Signal<T> & {
    set(value: T): void;
    update(updateFn: (value: T) => T): void;
};
