import {Signal, WritableSignal, signal} from '@angular/core';
import {
    MetadataHelper,
    IDataInfo,
    IViewElement,
    NULL_ViewElement,

    OType,
    ObjviewConstructor,
    StringMap,
    PATH_ROOT,
    ElementValidationState,
    PropertyTypology,
    ValidationState,
    isFunction,
    cacheValueAsValue,
    isEmptyString,
    isBlank,
    isDataAssigned,
    JsonObj,
    PATH_UNASSIGNED,
    ChangeSet,
    isStringAssigned,
    JoeLogger,
    ValidationScopes,
    PartialData,
    pathFromParent,
    ElementNotifications,
    Mutable,
    asMutable,
    IObjElementOf,
    clone
} from '../core';
import {corelateValidationWithParents, Tobject} from '../types';
import {ObjviewEditor} from './objview-editor';

const freezedSym = Symbol('__freezed__');
/**
 * Objview<T> is a view element over an JSON object implementing T interface.
 * A view element implements the same interface as its source JSON object, its goal is 
 * expose the same datastructure but enhanced with all the behaviour required by modern user and developper experience.
 * 
 * A view element is linked to the {@Link Tobject.html | object type model } related to T.
 * It enforces type validation on 'every changes' as 'on demande' and expose a validation state for rendering
 * 
 * A view element manage the editing session over its view hierarchy. 
 * Each view element of a model hierarchy is linked to its parent and its source JSON instance.
 * It instanciate a dedicated {@Link ObjviewEditor.html | Editor } to handles its changes.
 * 
 * A view element can generate a JSON object that is the clone of its current state and matches its {@Link Tobject.html | object type model } related to T. 
 * On an reconcilation process it is possible to keep all the change set alive until final response from the persistance layer.
 * The source object of a view element stay unchanged until {@Link ObjviewEditor.html#endEdit | endEdit is called}.
 * 
 * A view element allow custom behaviour and transient properties without breaking it T data contract.
 */
export class Objview<T = unknown> implements IViewElement, IObjElementOf<T> {
    private _parent_: IViewElement | undefined;
    private _refCache: StringMap<IViewElement | Promise<IViewElement>> | undefined;
    private _ver_ = 1;


    public $editor?: ObjviewEditor<T>;
    public $validation: ElementValidationState<T>;

    constructor(type: Tobject<T>, obj?: PartialData<T>, parent?: IViewElement) {
        this._parent_ = parent;
        this.$validation = new ElementValidationState<T>();
        if (obj === undefined) {
            obj = {} as T;
        }
        (this as unknown as any)[freezedSym] = undefined;
        const notPrepared = obj === undefined || MetadataHelper.isNotPrepared(obj);
        if (notPrepared || !parent) {
            type.prepare(obj, parent, PATH_ROOT);
        }

        MetadataHelper.link(obj, this, type);

        this._refCache = {};

        const names = Object.keys(type.allProperties);
        if (names && names.length > 0) {
            names.forEach((propertyName) => {
                const getter = function (this: Objview<T>) {
                    return this._read(propertyName);
                };

                const setter = function (this: Objview<T>, newVal: any) {
                    return this._write(propertyName, newVal);
                };

                if (delete (this as any)[propertyName]) {
                    Object.defineProperty(this, propertyName, {
                        get: getter,
                        set: setter,
                        enumerable: true,
                        configurable: true
                    });
                }
            });
        }
        type.viewctor = this.constructor as ObjviewConstructor;
    }

    public get $canSave(): boolean {
        return this.$isEditing
            && this.$validation.isValid()
            && this.$editor!.isTouched();
    }


    /**
     * 
     */
    public get $isEditing(): boolean {
        return this.$editor !== undefined && this._ver_ > 0;
    }



    public get $src(): IDataInfo<T> {
        return MetadataHelper.getTypeInfo(this)!;
    }

    /**
     *  get the tracking state of the view element.
     */
    public get $tracking(): boolean {
        const localTracking = (this as unknown as any)[freezedSym];
        if( localTracking === false ) {
            return false;   
        } else if( this.$isRoot() || this.$src.detached ) {
            return localTracking ?? true;
        } else if (localTracking === undefined) {
            return this.$parent().$tracking;
        } else {
            return localTracking;
        }
    }

    /**
     *  Set the tracking state of the view element.
     */
    public set $tracking(newTrackingState: boolean) {
        if(newTrackingState ) {
            const oldTracking = (this as unknown as any)[freezedSym];
            (this as unknown as any)[freezedSym] = undefined;
            if( oldTracking === false ) {
                this.validate(ValidationScopes.EnforceState);
            }
        } else {
             if( this.$isRoot() || this.$src.detached ) {
                (this as unknown as any)[freezedSym] = false;
            } else if (this.$parent().$tracking ) {
                (this as unknown as any)[freezedSym] = false;
            } else {
                 (this as unknown as any)[freezedSym] = undefined;
            }

        }
        
    }

    /**
     * return the `Type Element` type and the @Link( #types#object.getIndexPath | Element path )
     * @returns Meaning full description of the current instance
     */
    public $asString(): string {
        const src = this.$src ?? MetadataHelper.getTypeInfo(this);
        if (src) {
            const otype = src.type as Tobject;
            const path = src.path === PATH_ROOT ? otype.getIndexPath(this) : src.path;
            return `${otype.title} - ${path}`;
        }
        return JSON.stringify(this.$src.obj);
    }

    /**
     * Assign a set of properties with a single DataChange notification instead raising as many notification as property changed .
     * @param value a partial definition of T
     * @param withRootNotification flag to avoid DataChange Notification 
     * @returns the view itself.
     */
    public $assign(value: PartialData<T>, isRootAssign: boolean = true): this {
        this.$edit(false);
        try {
            const type = this.$src.type as OType;
            Object.keys(value).forEach((propertyName) => {
                const propertyType = type.allProperties[propertyName];
                if (propertyType) {
                    switch (propertyType.kind) {
                        case PropertyTypology.Scalar:
                            this._write(propertyName, (value as any)[propertyName]);
                            break;

                        default:
                            const child = this._read(propertyName) as (IObjElementOf);
                            if (child) {
                                child.$assign((value as any)[propertyName], false);
                            }
                            else {
                                propertyType.assignNewViews(value, this, false);
                            }
                            break;
                    }
                }
            });

        } catch (ex) {
            JoeLogger.error(ex as Error);
        }
        finally {
            this.$tracking = true;
            if (isRootAssign) {
                this.validate(ValidationScopes.EnforceState, undefined, false);
                this.$notifyEvent(ElementNotifications.dataChanged);
            }

        }
        return this;
    }

    /**
     * return all properties that are not scalar values.
     * @returns all children instances.
     */
    public $children(): StringMap<IViewElement> {
        if (this._refCache) {
            return this._refCache as StringMap<IViewElement>;
        }
        return {};
    }

    /**
     * Return a new instance on a clone of the source instance but with a new parent.
     * @param parent new parent element.
     * @returns new instance.
     */
    public $clone(parent?: IViewElement): this {
        const cloneObj = clone<T>(this.$src.obj);
        return this.constructor(this.$src.obj as Tobject<T>, cloneObj, parent) as this;
    }

    /**
     * Turn on edit mode by creating an $editor.
     * 
     * Calling $edit when the view is already in edit mode just return the current $editor.
     * @param forceTracking flag to cancel change notification on property change
     * @returns $editor instance
     */
    public $edit(withTracking: boolean = true, doNotification: boolean = true): ObjviewEditor<T> {
        if (withTracking === false) {
            this.$tracking = false;
        }
        if (!this.$editor) {
            if (this._refCache) {
                cleanCache(this._refCache);
            }
            if (!this.$editor) {
                 this.$notify(doNotification 
                    ? ElementNotifications.editing
                    : ElementNotifications.editingWithoutNotification);
            }
        }
        return this.$editor!;
    }

    /**
     * Terminate edit mode if any.
     * @param localBranch (default: false) when 'true' changes are applied from current element otherwhy from the root element.
     * @returns this instance
     */
    public $endEdit(localBranch: boolean = false, raiseNotif: boolean = true): this {
        if (this.$isEditing) {
            this.$editor!.endEdit(localBranch, raiseNotif);
        }
        return this;
    }

    /**
     * Helper method to indicate if the current instance is the root element of the domain model hierarchy.
     * @returns yes -> it is the root instance -  no it is a children element.
     */
    public $isRoot(): boolean {
        return this._parent_ === undefined;
    }

    /**
     * Return a Json payload matching the Type Model of the View and its current state.
     * 
     * @remark All transient property.es declare on the View class won't be include.  
     * 
     * @returns Json instance
     */
    public $json(): JsonObj {
        const data = {} as any;
        const src = this.$src;
        const type = src.type as OType;
        const propDefs = type.allProperties;
        for (const p in propDefs) {
            if (propDefs.hasOwnProperty(p)) {
                const propDef = propDefs[p]!;
                const propertyValue = this._read(p);
                switch (propDef.kind) {
                    case PropertyTypology.Scalar:
                        if (isDataAssigned(propertyValue)) {
                            data[p] = propertyValue as JsonObj;
                        }
                        break;
                    default:
                        if (propertyValue !== undefined) {
                            const json = propertyValue.$json();
                            if (isDataAssigned(json)) {
                                data[p] = json;
                            }
                        }
                }
            }
        }
        return isDataAssigned(data)
            ? data
            : {} as JsonObj;
    }

    /**
     * retur a new child intance having the current view as parent.
     * 
     * @remark to use when you want to override a child instance with a new reference.
     * @param childType type of the child instance (should be an IViewElement)
     * @returns new child instance.
     */
    public $newChild<U extends IViewElement>(childType: ObjviewConstructor): U {

        const child = new childType(undefined, this) as U;
        child.$src.type.prepare(child.$src.obj, this.$src.obj, PATH_UNASSIGNED);
        child.$edit(false);
        return child;
    }

    /**
     * Bubble up an an event type to the root element.
     * 
     * on each element if a viewModel is linked then the event is notify to the @link(core#types#ElementNotifications | Element Context).
     * @param event @link(core#enums#ElementNotifications | Event type)
     * @returns void
     */
    public $notify(event: ElementNotifications) {
        switch (event) {
            case ElementNotifications.editingWithoutNotification:
                this.$editor ??= new ObjviewEditor(this);
                return;
            case ElementNotifications.editing:
                this.$editor ??= new ObjviewEditor(this);
                this.validate(ValidationScopes.State);
                this.$notifyEvent(event);
                break;
            case ElementNotifications.cancelEdit:
            case ElementNotifications.endEdit:
                this.$validation.clear();
                this.$editor = undefined;
                this.$notifyEvent(event);
                break;
            default:
                if (this.$tracking) {
                    this.$notifyEvent(event);
                }
                break;
        }
    }

    /**
     * Helper method that return the parent element.
     * 
     * @remark When the current instance is the root element it returns itself.
     * @returns parent element or itself when root.
     */
    public $parent(): IViewElement {
        return this._parent_ || this;
    }

    /**
     * You use this method when want to want to reset the view on a new source instance (json).
     * 
     * Use case: you have a view set on a source instance comming from a first call on your backend and you need to retrieve a latest version of this source object and you want to reset the existing view on it.
     * 
     * @remark It will keep your changeset, So it can be used when you want to save a new version and the backend return that your version is no more the current one and you need to renew you source instance.
     * @param data new source instance
     * @param keepChanges flag to keed the change set alive (false by default)
     * @returns void
     */
    public $refresh(data: any, keepChanges = false): void {
        const src = this.$src;
        const path = src.path;
        const oldData = src.obj;
        const otype = src.type as OType;

        if (!src.isRoot) {
            (this.$parent() as any).$refreshChild(pathFromParent(path), data);
        } else {
            const changeSet = [] as ChangeSet;
            if (this.$isEditing) {
                this.$editor!.writeChangeSet(changeSet);
                this.$editor!.cancelEdit();
            }
            if (this._refCache) {
                const cacheKeys = Object.keys(this._refCache);
                if (cacheKeys && cacheKeys.length > 0) {
                    cacheKeys.forEach((p) => (this._refCache![p] as IViewElement).$release());
                }
                this._refCache = {};
            }

            otype.prepare(data, undefined, PATH_ROOT);
            MetadataHelper.link(data, this, otype);
            MetadataHelper.releaseDoc(oldData);

            if (keepChanges && changeSet.length > 0) {
                this.$edit().applyChangeSet(changeSet);
            }
            this.$notify(ElementNotifications.dataChanged);
        }
    }

    /**
     * You use this method when want to want to reset the source instance of a child element(json).
     * 
     * @remark It can not be used on an editing view.
     * @param data new source instance
     * @returns void
     */
    public $refreshChild(property: string, data: any): void {
        const src = this.$src;
        const otype = src.type as OType;

        const obj: any = this.$src.obj;

        const oldData = obj[property];
        if (oldData) {
            MetadataHelper.detach(oldData);
        }
        obj[property] = data;
        otype.prepare(obj, data, property);

        if (this._refCache && this._refCache[property]) {
            delete this._refCache[property];
        }
        this.$notify(ElementNotifications.dataChanged);
    }

    /**
     * Internal method used by JOE framework to help GC by releasing all used ressources:
     * 
     * - it set signal as undefined
     * - release existing editor
     * - release existing changeset
     * - remove parent reference
     */
    public $release(): void {
        this._ver_ = -111;
        const self = this;
        if (this._refCache) {
            const children = this.$children();
            const childrenNames = Object.keys(children);
            if (childrenNames && childrenNames.length > 0) {
                childrenNames.forEach((prop) => {
                    const value = children[prop];
                    if (isFunction(value?.$release)) {
                        value.$release();
                    }
                });
            }
        }
        self.$editor = undefined;
        self._refCache = undefined;
        self._parent_ = undefined;
        MetadataHelper.clearTypeInfo(self);
    }

    /**
     * 
     * @returns Retrieve the root Element of the `Type Model` hierarchy.
     * 
     * @remark Return itself when current instance is root.
     */
    public $root(): IViewElement {
        let parent = this._parent_;
        while (parent && !parent.$isRoot()) {
            if (parent !== parent.$parent()) {
                parent = parent.$parent();
            } else {
                throw new Error('Infinite loop on Objview.$root()!');
            }
        }
        return (parent || this) as IViewElement;
    }

    /**
     * Check the validity of the current view over its `Type Model'.
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
    public validate(
        scope: ValidationScopes = ValidationScopes.State,
        scopeRef?: any,
        raiseNotif: boolean = true
    ): ValidationState {
        const validationContext = this.$validation;
        if (!this.$tracking) {
            return validationContext;
        }
        const type = this.$src.type;
        type.validate(this, scope, scopeRef);
        corelateValidationWithParents(this);
        validationContext.debug(scope == ValidationScopes.Property ? scopeRef : undefined);
        if (raiseNotif && scope !== ValidationScopes.Property) {
            this.$notify(ElementNotifications.validation);
        }

        return validationContext;
    }

    /**
     * Check the validity of an object instance on the current schema.
     * @param scope instance to validate (required).
     * @returns ValidationResult, map of errors by property name;
     */
    public validateAsync(property: string, delay?: number): void {
        const validationFunc = () => {
            const validationContext = this.$validation;
            if (isDataAssigned(validationContext.errors[property])) {
                return;
            }
            (this.$src.type as OType).validateAsync(this, ValidationScopes.Property, property);
            this.$validation.debug(property);
            // this.$notify(ElementNotifications.validation);
        };
        if (delay) {
            setTimeout(validationFunc, delay);
        } else {
            validationFunc();
        }
    }

    protected $notifyEvent(event: ElementNotifications) {
        this._ver_++;

        const src = this.$src;
        const isRoot = this.$isRoot();
        // const version = `- version is ${this._ver_}`;
        // const model = isRoot
        //     ? `Model ${this.constructor.name}`
        //     : `Model ${this.$root().constructor.name} (${src.docPath})`;
        // JoeLogger.debug(`ACTION - ${model} notifies event ${event} ${version}`);
        
        if (!isRoot) {
            this.$parent().$notify(event);
        }
        const viewmodel = src.viewmodel;
        if (viewmodel) {
            viewmodel.notifyChanges({type: event, source: this});
        }
    }

    private _read(property: string, readOriginal: boolean = false): any {
        if (this._ver_ === -111) {
            return 'RELEASED_ITEM';
        }
        if (this.$editor && !readOriginal) {
            if (this.$editor.isDirty(property)) {
                return cacheValueAsValue(this.$editor.editCache[property]);
            }
        }
        const src = this.$src;
        const obj = src.obj;
        const type = src.type as OType;
        const propInfo = type.allProperties[property]!;

        // scalar
        if (propInfo.kind === PropertyTypology.Scalar) {
            return propInfo.readAsView(obj, this);
        } else if (this._refCache) {
            const cachedValue = this._refCache[property];

            if (cachedValue) {
                return cacheValueAsValue(cachedValue);
            }
            const value = propInfo.readAsView(obj, this);
            if (!readOriginal) {
                this._refCache[property] = value || NULL_ViewElement;
            }
            if (value && this.$isEditing && propInfo.required) {
                value.$edit(value.$tracking, false);
            }
          
            
            return value;
        }
        return undefined;
    }

    private _write(property: string, value: any) {
        if (isEmptyString(value)) {
            value = undefined;
        }
        const src = this.$src;
        const type = src.type as OType;
        const propInfo = type.allProperties[property]!;
        // write same value
        // if ( !propInfo.lookup ) {
        const objValue = this._read(property);
        if (value === objValue) {
            return;
        }

        const editor = this.$edit();
        const wasDirty = editor.isDirty();
        const isPropertyRoolback = editor.isDirty(property) && value === this._read(property, true);
        if (isPropertyRoolback) {
            if (!isBlank(editor.editCache[property])) {
                delete editor.editCache[property];
            }
        } else {
            editor.editCache[property] = isBlank(value) ? NULL_ViewElement : value;
        }
        if (value !== undefined && propInfo.kind === PropertyTypology.Object) {
            src.setParentChildView(value as IViewElement, property);
        }
        const changedHandlerName = property + 'Changed';

        if (isFunction((this as any)[changedHandlerName])) {
            ((this as any)[changedHandlerName] as Function)();
        }

        this.validate(ValidationScopes.Property, property, false);
        this.$notify(ElementNotifications.dataChanged);

    }


}

function cleanCache(refCache: StringMap<IViewElement | Promise<IViewElement>>) {
    if (refCache) {
        const cacheKeys = Object.keys(refCache);
        if (cacheKeys && cacheKeys.length > 0) {
            cacheKeys
                .filter((p) => refCache![p] === NULL_ViewElement)
                .forEach((p) => delete refCache![p]);
        }
    }
}



