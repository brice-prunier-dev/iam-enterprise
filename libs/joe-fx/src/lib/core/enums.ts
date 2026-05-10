
/**
 * Data action used in a {@link DataPayload} notification.
 * * @enum
 */
export enum DataAction {
    Sync = 'sync',
    Loaded = 'loaded',
    Init = 'init',
    Wait = 'wait',
    Break = 'break',
    Complete = 'complete',
    Execute = 'exec',
    Edit = 'edit',
    EndEdit = 'endedit',
    Updated = 'updated',
    Added = 'add',
    Removed = 'remove',
    Clear = 'clear',
    Modified = 'modify',
    Pause = 'pause',
    Reset = 'reset',
    ErrorRaised = 'error',
    Released = 'release',
    Validation = 'validation'
}

/**
 * Editing state
 * * @enum
 */
export enum EStateChanges {
    none = 'none',
    inserted = 'new',
    deleted = 'del',
    updated = 'upd'
}

/**
 * Message typology
 * * @enum
 */
export enum ElementMessageType {
    Error,
    Warning,
    TypeDef,
    Trace,
    Debug,
    DebugData
}

export enum ElementNotifications {
    dataChanged = 'dataChanged',
    validation = 'validation',
    editing = 'editing',
    editingWithoutNotification = 'silence-editing',
    cancelEdit = 'cancelEdit',
    endEdit = 'endEdit',
}

export enum ModelNotifications {
    startOfOperation = 'startOfOperation',
    endOfOperation = 'endOfOperation',
    stateChanged = 'stateChanged',
    dataChanged = 'dataChanged',
    loaded = 'loaded',
    custom = 'custom',
}

/**
 * Json typology enumeration.
 * @enum
*/
export enum PropertyTypology {
    Scalar,
    Object,
    List,
    Tuple,
    Map
}

/**
 * When a Joe Path's part typology.
 * An Joe Path is compose of 'parts' with '->' as sperator.
 * When a path is splited into path parts, it qualifies the part.
 * * @enum
 */
export enum SelectorTypes {
    /**
     * Format: '[x]' with x as an index (integer).
     */
    ArrayIndexOf,
    /**
     * Format: '(#45)' or '(Xxx)' or '(Xxx, #45)'.
     * Having a value surrount by () means the parent part is an array and we are targeting a child item by its index.   
     * (#x): path part targeting the child item having 'x' as integer index value: # indicates the rest of the value is an integer.
     * (Xxx): indicates we are targeting the child item having 'Xxx' as string index value.
     * (Xxx, #45) indicates we are targeting the child item having the following composite index: string Xxx and integer x.
     */
    ArrayIndexValues,
    /**
     * Format: '{key: Xxx}'.
     * Having a value surrount by {} means the parent part is an array and we are targeting a child item having the following property.ies.   
     * {key: Xxx} indicates we are targeting the child item having a property named 'key' with the value Xxx.
     */
    ArrayIndexObject,
    /**
     * '.': starting symbol indicating we are starting from the curent instance element.
     */
    Local,
    /**
     * the content of the part is a property name.
     */
    Property,
    /**
     * '$': starting symbol indicating we are starting from root of the current hierarchy instance.
     */
    Root,
    /**
     * '..': starting symbol indicating we are starting from the parrent of curent instance element.
     */
    ToParent
}

/**
 * ValidationScopes rules document element validation process.
 * * @enum
 */
export enum ValidationScopes {
    /**
     * Validation constant parameter.
     * 
     * Run initial state validation.
     * 
     * @remarks
     * _ValidationScope.State_ ensure that validation is ran only once.
     * 
     * Only __Property__, __AddChild__ or __RemoveChild__ can alter initial state validation.
     * 
     * Trigerring multiple validation with _ValidationScope.State_ will not compute useless validation.
     */
    State = 'State',
    /**
     * Validation constant parameter.
     * 
     * Enforce a new state validation calculation even initial validation has been ran.
     * 
     * @remarks
     * Used on Editor.CancelEdit.
     */
    EnforceState = 'EnforceState',
    /**
     * Validation constant parameter.
     * 
     * Alter current validation state on a specific property.
     * 
     */
    Property = 'Property',
    /**
     * Validation constant parameter.
     * 
     * Alter the current validation state of a collection due to a new item.
     * 
     * @remarks
     * Using _ValidationScope.AddChild_ implies an other validation parameter that is the added item: __scopeRef__.
     */
    AddChild = 'AddChild',
     /**
     * Validation constant parameter.
     * 
     * Alter the current validation state of a collection due to an item removal.
     * 
     */ 
     RemoveChild = 'RemoveChild',
    /**
     * Validation constant parameter.
     * 
     * Alter the current validation state of an element having rules to compute.
     * 
     * @remarks
     * _ValidationScope.Rule_ is applied only on valid state.
     */
    Rule = 'Rule'
}
