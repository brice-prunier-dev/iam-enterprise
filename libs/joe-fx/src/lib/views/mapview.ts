import {Observable} from 'rxjs/internal/Observable';
import {Subject} from 'rxjs/internal/Subject';
import {
    DataPayload,
    MType,
    MapProperty,
    MapviewConstructor,
    ObjviewConstructor,
    PropertyTypology,
    Scalar,
    SetviewConstructor,
    StringMap,
    MetadataHelper,
    IDataInfo,
    IViewElement,
    ListValidationState,
    ValidationState,
    JsonObj,
    PATH_ROOT,
    PATH_UNASSIGNED,
    ChangeSet,
    asObject,
    ValidationScopes,
    JoeLogger,
    PartialData,
    pathFromParent,
    ElementNotifications,
    Mutable,
    asMutable,
    IMapElementOf,
    clone,
    isArrayAssigned
} from '../core';
import {Tmap, MapViewFactory, corelateValidationWithParents, ArrayViewFactory} from '../types';
import {MAPKEY, MapviewEditor} from './mapview-editor';

const mapfreezedSym = Symbol('__freezed__');

export class Mapview<T extends Scalar | IViewElement>
    implements Iterable<T>, IViewElement, IMapElementOf<T>, StringMap<T> {
    [key: string]: T | any;
    private _keys: string[];
    private _parent_: IViewElement | undefined;
    private _ver_ = 1;

    /**
     * Editor instantiated when the view is in an editing mode
     */
    public $editor?: MapviewEditor<T>;
    public $validation: ListValidationState;

    public get $canSave(): boolean {
        return this.$isEditing
            && !this.$validation.withError()
            && this.$editor!.isTouched();
    }

    /**
     * Editing property flag
     */
    public get $isEditing(): boolean {
        return this.$editor !== undefined;
    }

     /**
     *  get the tracking state of the view element.
     */
    public get $tracking(): boolean {
        const localTracking = (this as unknown as any)[mapfreezedSym];
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
                const oldTracking = (this as unknown as any)[mapfreezedSym];
                (this as unknown as any)[mapfreezedSym] = undefined;
                if( oldTracking === false ) {
                    this.validate(ValidationScopes.EnforceState);
                }
            } else  if( this.$isRoot() || this.$src.detached ) {
                (this as unknown as any)[mapfreezedSym] = false;
            } else if (this.$parent().$tracking ) {
                (this as unknown as any)[mapfreezedSym] = false;
            } else {
                    (this as unknown as any)[mapfreezedSym] = undefined;
            }
        }
        

    /**
     * Element info accessor.
     * Is undefined if not prepared.
     */
    public get $src(): IDataInfo<Record<string, T>> {
        return MetadataHelper.getTypeInfo(this)!;
    }

    /**
     * Map Length
     */
    public get length(): number {
        return this._keys ? this._keys.length : 0;
    }




    constructor(obj: any, parent?: IViewElement, type?: MType) {

        if (type === undefined) {
            throw new Error('Type is required');
        }
        this._parent_ = parent;
        const mapOj = obj ?? {};
        const notPrepared = mapOj === undefined || MetadataHelper.isNotPrepared(mapOj);
        if (notPrepared || !parent) {
            type.prepare(mapOj, parent, PATH_ROOT);
        }

        (this as unknown as any)[mapfreezedSym] = undefined;
        MetadataHelper.link(mapOj, this, type as Tmap);
        this._keys = [];

        this.$validation = new ListValidationState();
        this._keys = Object.keys(mapOj) || [];

        const itemInfo = (type as Tmap).itemsTypeDef as MapProperty;
        const selfAsParent = this as IViewElement;
        this._keys.forEach((p) => {
            if (!this.get(p)) {
                const entity = itemInfo.readAsView(mapOj, p, selfAsParent) as T;
                (entity as unknown as any)[MAPKEY] = p;
                this._init(p, entity);
            }
        });
    }

    public $asString(): string {
        const src = this.$src;
        if (src) {
            return `${src.type.title} - ${src.path}`;
        }
        return this.constructor.name;
    }

    /**
     * Method to assign a set of changes as a single operation.
     * 
     * It avoid to raise as many data change notification as changes
     * 
     * At the end just a single generic notification is sent 
     * @param valueToAssign 
     * @returns 
     */
    public $assign(valueToAssign: Record<string, PartialData<T>>, isRootAssign: boolean = true): this {
        if (valueToAssign !== undefined) {
            const editor = this.$edit(false);
            try {
                for (const entry of Object.entries(valueToAssign)) {
                    const key = entry[0];
                    const value = entry[1];
                    const child = this.get(key);
                    if (child) {
                        if (this.$containsScalars()) {
                            this.set(key, value as T);
                        } else {
                            (child as any).$assign(value as any, isRootAssign);
                        }
                    } else {
                        const newChild = this.$newChild();
                        (newChild as any).$assign(value, isRootAssign);
                        this.set(key, newChild as T);

                    }
                }
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
        }
        return this;
    }

    /**
     * Accesor on children entities
     */
    public $children(): StringMap<IViewElement> {
        const map: StringMap<IViewElement> = {};

        if (this._keys && (this.$src.type as Tmap).itemsTypeDef!.kind !== PropertyTypology.Scalar) {
            for (const key of this._keys) {
                map[key] = this.get(key) as IViewElement;
            }
        }
        return map;
    }

    /**
     * Clone the map on the same data and set
     * @param parent Clone the map on the same data
     */
    public $clone(parent?: IViewElement): Mapview<T> {
        const cloneObj = clone<Record<string, T>>(this.$src.obj);
        return new Mapview<T>(cloneObj, parent, this.$src.type as MType);
    }

    /**
     * Star edit mode by returning an MapviewEditor.
     * If it was editing, the previous editor is retrun.
     */
    public $edit(withTracking: boolean = true, doNotification: boolean = true): MapviewEditor<T> {
        if (withTracking === false) {
            this.$tracking = false;
        }
        if (!this.$editor) {
           this.$notify(doNotification 
                ? ElementNotifications.editing
                : ElementNotifications.editingWithoutNotification);
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


    public $containsScalars(): boolean {
        return (this.$src.type as Tmap).itemsTypeDef!.kind === PropertyTypology.Scalar;
    }

    /**
     * Is root property flag
     */
    public $isRoot(): boolean {
        return this._parent_ === undefined;
    }

    public $json(): JsonObj {
        const data: any = {};
        if (this.$containsScalars()) {
            for (const p of this._keys) {
                data[p] = this.get(p) as Scalar;
            }
        } else {
            for (const p of this._keys) {
                data[p] = (this.get(p) as IViewElement).$json();
            }
        }
        return data as unknown as JsonObj;
    }

    /**
     * New child entity helper method
     * @param childType: Child constructor.
     */
    public $newChild<Ta extends IViewElement>(initData?: any): Ta {
        const tt = (this.$src.type as Tmap).itemsTypeDef!.def as any;
        const itemType = tt.type as string;
        let child: Ta;
        switch (itemType) {
            case 'object':
                const otype = tt.viewctor as ObjviewConstructor;
                child = new otype(initData, this) as Ta;
                break;
            case 'array':
                const atype = tt.viewctor as SetviewConstructor;
                child = atype !== undefined
                    ? new atype([], this) as Ta
                    : ArrayViewFactory.Create([], tt, this) as unknown as Ta;
                break;
            case 'map':
                const mtype = tt.viewctor as MapviewConstructor;
                child = mtype !== undefined
                    ? new mtype([], this) as Ta
                    : MapViewFactory.Create({}, tt as MType, this) as unknown as Ta;
                break;
            default:
                throw new Error(`Unknow ${itemType} on ${this.$src.type.title}`);
        }
        tt.prepare(child.$src.obj, this.$src.obj, PATH_UNASSIGNED);
        child.$edit(this.$tracking);
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
                this.$editor ??= new MapviewEditor<T>(this as any, this._keys);
                return;
                
            case ElementNotifications.editing:
                this.$editor ??= new MapviewEditor<T>(this as any, this._keys);
                break;
            case ElementNotifications.cancelEdit:
            case ElementNotifications.endEdit:
                this.$validation.clear();
                this.$editor = undefined;
                break;

        }



        if (this.$tracking) {
            this.$notifyEvent(event);
        }

    }

    protected $notifyEvent(event: ElementNotifications) {
        this._ver_++;
        const isRoot = this.$isRoot();

        const src = this.$src;
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
    /**
     * Parent element accessor (self if none).
     */
    public $parent(): IViewElement {
        return this._parent_ === undefined ? this : this._parent_;
    }

    public $refresh(data: Record<string, T>): void {
        const src = this.$src;
        const path = src.path;
        const mtype = src.type as MType;
        if (!src.isRoot) {
            (this.$parent() as any).$refreshChild(pathFromParent(path), data);
        } else {
            mtype.prepare(data, undefined, PATH_ROOT);

            this.$src.obj = data;
            const changeSet = [] as ChangeSet;

            if (this.$isEditing) {
                this.$editor!.writeChangeSet(changeSet);
                this.$editor!.cancelEdit();
            }

            src.obj = data;
            if (!parent) {
                mtype.prepare(data, null, PATH_ROOT);
            }

            this.clear();

            this._keys = [];

            this._keys = Object.keys(data) || [];
            const itemInfo = mtype.itemsTypeDef as MapProperty;
            this._keys.forEach((p) => {
                const item = this.get(p);
                if (!item) {
                    const entity = itemInfo.readAsView(data, p, this) as T;
                    (entity as unknown as any)[MAPKEY] = p;
                    this._init(p, entity);
                }
            });

            if (changeSet.length > 0) {
                this.$edit().applyChangeSet(changeSet);
            }

        }
        this.$notify(ElementNotifications.dataChanged);
    }

    public $refreshChild(property: string, data: any): void {
        const src = this.$src;
        const mtype = src.type as MType;
        if (!mtype.containsScalars) {
            return;
        }
        const mapObj = this.$src.obj;

        const oldData = mapObj[property];
        if (oldData) {
            MetadataHelper.detach(oldData);
        }

        mapObj[property] = data;
        const itemInfo = mtype.itemsTypeDef as MapProperty;
        itemInfo.prepare(mapObj, data, property);

        const viewExists = this._keys.includes(property);
        if (viewExists) {
            this._init(property, itemInfo.readAsView(data, property, this) as T);
        }
        this.$notify(ElementNotifications.dataChanged);
    }

    /**
     * Free resources when the element is no more used.
     */
    public $release(): void {
        this.clear();
        this.$editor = undefined;
        this._parent_ = undefined;
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

 

    public [Symbol.iterator]() {
        const keys = this.keys();
        let iterarorIndex = 0;
        const readItem: (s: string) => T = this.get;
        return {
            next(): IteratorResult<T> {
                if (iterarorIndex < keys.length) {
                    return {
                        done: false,
                        value: readItem(keys[++iterarorIndex]!) as T
                    };
                } else {
                    return {
                        done: true,
                        value: readItem(keys[keys.length - 1]!) as T
                    };
                }
            }
        };
    }

    public clear(): void {
        if (isArrayAssigned(this._keys)) {
            const mtype = this.$src.type as MType;
            this._keys.forEach((key) => {
                if (!mtype.containsScalars) {
                    (this.get(key) as IViewElement).$release();
                }
                delete (this as any)[key];
            });
        }

        this._keys = [];

    }

    /**
     * Value accessor.
     * @param key : key value.
     */
    public get(key: string): T {
        return (this as any)[key] as T;
    }

    /**
     * Return the map key for the input value
     * @param value map value
     * @returns key value
     */
    public keyOf(value: any): string {
        const mtype = this.$src.type as MType;
        if (mtype.containsScalars) {
            if (isArrayAssigned(this._keys)) {
                for (const prop of this._keys) {
                    if (value === this.get(prop)) {
                        return prop;
                    }
                }
            }
        } else {
            return value[MAPKEY];
        }
        return '';
    }

    /**
     * A Mapview has some owned properties,
     * so it needs a dedicated methods to list key values used as "map key"
     * @returns All map keys
     */
    public keys(): string[] {
        return this._keys.slice();
    }

    private _init(key: string, view: T | undefined): this {
        (this as any)[key] = view;
        return this;
    }

    public set(key: string, view: T | undefined): this {
        this.$edit().set(key, this._keys, view);
        return this;
    }

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
        validationContext.debug(type.title + ' - ' + scope, this.$isRoot());
        if (raiseNotif && scope !== ValidationScopes.Property) {
            this.$notify(ElementNotifications.validation);
        }
        return validationContext;
    }
}

MapViewFactory.InitializeConstructor(Mapview);
