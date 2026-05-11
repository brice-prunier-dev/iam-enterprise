import {Observable} from 'rxjs/internal/Observable';
import {Subject} from 'rxjs/internal/Subject';
import {
    PATH_ROOT,
    MetadataHelper,
    IDataInfo,
    IViewElement,
    ISetElementOf,
    PropertyTypology,
    DataPayload,
    ObjviewConstructor,
    AType,
    Scalar,
    MapviewConstructor,
    SetviewConstructor,
    MType,
    ListValidationState,
    ValidationState,
    JsonObj,
    PATH_UNASSIGNED,
    ChangeSet,
    extractContent,
    isTextArray,
    isMatchingIndexObj,
    asArray,
    ValidationScopes,
    JoeLogger,
    isMatchingSelector,
    indexObjAsIndexSelector,
    PartialData,
    pathFromParent,
    ElementNotifications,
    JsObject} from '../core';
import {Tarray, ArrayViewFactory, corelateValidationWithParents, MapViewFactory} from '../types';
import {SetviewEditor} from './setview-editor';


const setfreezedSym = Symbol('__setfreezed__');

function nowrite() {
    return;
}

export class Setview<T extends Scalar | IViewElement>
    extends Array<T>
    implements IViewElement, ISetElementOf<T> {
    private _parent_?: IViewElement;
    private _ver_ = 1;

    /**
     * Editor instantiated when the view is in an editing mode
     */
    public $editor?: SetviewEditor<T>;
    public $validation: ListValidationState;

    public get $canSave(): boolean {
        return this.$editor !== undefined;
             && !this.$validation.withError()
            && this.$editor!.isTouched();
    }


    public get $containsScalars(): boolean {
        return (this.$src.type as Tarray).itemsTypeDef?.kind === PropertyTypology.Scalar;
    }

    public get $isEditing() {
        return this.$editor !== undefined;
    }

     /**
     *  get the tracking state of the view element.
     */
    public get $tracking(): boolean {
        const localTracking = (this as unknown as any)[setfreezedSym];
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
            const oldTracking = (this as unknown as any)[setfreezedSym];
            (this as unknown as any)[setfreezedSym] = undefined;
            if( oldTracking === false ) {
                this.validate(ValidationScopes.EnforceState);
            }
        } else {
            if( this.$isRoot() || this.$src.detached ) {
                (this as unknown as any)[setfreezedSym] = false;
            } else if (this.$parent().$tracking ) {
                (this as unknown as any)[setfreezedSym] = false;
            } else {
                 (this as unknown as any)[setfreezedSym] = undefined;
            }
        }
    }
    



    public get $src(): IDataInfo<Array<T>> {
        return MetadataHelper.getTypeInfo(this)!;
    }


    constructor(obj?: any[], parent?: IViewElement, type?: AType) {
        super();
        this.$validation = new ListValidationState();
        
        if(type === undefined){
            return;
        }
        Object.setPrototypeOf(this, new.target.prototype);
        
        // Object.setPrototypeOf( this, Setview.prototype );
        

        const notPrepared = obj === undefined || MetadataHelper.isNotPrepared(obj);
        const array = obj ?? [];
        this._parent_ = parent;
        
        if (notPrepared || !parent) {
            type!.prepare(array, parent, PATH_ROOT);
            if (!parent) {
                this.onViewChanged = new Subject<DataPayload>();
            }
        }

        (this as unknown as any)[setfreezedSym] === undefined;


       
        const atype = type as Tarray;
        MetadataHelper.link(array, this, atype);
        const src = MetadataHelper.getTypeInfo(this)!;
        if (src === undefined) {
            throw new Error('$src can not be initialized');
        }
        // const obj = this as any;
        // obj[symbol] = dataInfo;
        // this[symbol] = dataInfo;
        if (!atype.isTuple) {
            if (array && atype.itemsTypeDef!.kind === PropertyTypology.Scalar) {
                array.forEach((scalarValue) => this.push(scalarValue));
            } else if ((atype.itemsTypeDef?.def as any ).withIndex) {
                const sortViews = array.map<T>((value, i) => {
                    // atype.prepare(value, array, wrapAsPositionSelector(i));
                    return atype.itemsTypeDef!.readAsView(value, i, this);
                }, this);
                ArrayViewFactory.SortFromTypeDef<T>(sortViews).forEach((e: T) => this.push(e));
            } else {
               // atype.itemsTypeDef!.prepare(array, undefined, PATH_ROOT);
                array.forEach((value, i) => {
                    // atype.itemsTypeDef!.prepare(value, undefined, PATH_ROOT);
                    this.push(atype.itemsTypeDef!.readAsView(value, i, this));
                }, this);
            }
        }
    }

    public add(input: T, index: number = -1) {
        this.$edit().add(input, index);
    }

    public update(index: number, input: T) {
        this.$edit().update(index, input);
    }

    public $assign(value: PartialData<T>[], isRootAssign: boolean = true, reset: boolean = false): this {

        if (asArray(value)) {
            this.$edit(false);
            try {
                const isScalar = this.$containsScalars;
                const atype = this.$src.type as Tarray;
                let toRemove: T[] = [];
                if (isScalar) {
                    if (reset) {
                        toRemove = this.filter((item) => !value.includes(item) as T);
                        toRemove.forEach((item) => this.remove(item));
                    }
                    for (const assignItem of value) {
                        this.add(assignItem as T, this.length);
                    }
                } else {
                    if (reset && atype.withIndex && value.length > 0 && this.length > 0) {
                        for (const childItem of this) {

                            const childItemIndexVal = atype.getIndexValue(childItem);

                            const childItemIndexObj = atype.buildIndexObjFromSelectorValue(childItemIndexVal!);
                            for (let idx = 0; idx < value.length; idx++) {
                                if (isMatchingIndexObj(value[idx], childItemIndexObj)) {
                                    toRemove.push(childItem);
                                    break;
                                }
                            }
                        }
                        toRemove.forEach((item) => this.remove(item));
                    }

                    const chekDeleted = this.$isEditing && this.$editor!.hasDeletedItem;
                    for (const assignItem of value) {

                        if (chekDeleted) {
                            const deletedInfo = this.$editor!.indexInfoOfDeletedItem(assignItem);
                            if (deletedInfo) {
                                const childView = (this.$newChild() as any).$assign(assignItem as any) as T;
                                this.add(childView, deletedInfo[0]);
                                continue;
                            }
                        }

                        let assignDone = false;

                        const indexVal = atype.getIndexValue(assignItem);

                        if (indexVal) {
                            const idxObj = atype.buildIndexObjFromSelectorValue(indexVal);

                            for (let idx = 0; idx < this.length; idx++) {
                                if (isMatchingIndexObj((this[idx] as IViewElement).$src.obj, idxObj)) {
                                    assignDone = true;
                                    (this[idx] as any).$assign(assignItem as any);
                                    break;
                                }
                            }
                        }
                        if (!assignDone) {
                            const childView = (this.$newChild() as any).$assign(assignItem as any) as T;
                            this.add(childView, this.length);
                        }
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

    public $children(): IViewElement[] {
        if (!this.$containsScalars) {
            const result: IViewElement[] = [];
            for (const i of this) {
                const di = i as any;
                result.push(di as IViewElement);
            }
            return result;
        }
        return [];
    }

    public $getByIndex(...keyValues: (string | number)[]): T | undefined {
        const selector = indexObjAsIndexSelector(keyValues);
        const atype = this.$src.type as AType;
        const itemType = atype.itemsTypeDef?.def;
        if (itemType instanceof Tarray && (itemType as Tarray).isTuple) {

            for (let idx = 0; idx < this.length; idx++) {

                var path = atype.getIndexPath(this[idx]);
                if (path === selector) {
                    return this[idx];
                }
            }

        } else {
            for (let idx = 0; idx < this.length; idx++) {

                if (isMatchingSelector((this[idx] as IViewElement), selector)) {
                    return this[idx];
                }
            }
        }

        return undefined;
    }

    public $json(): JsonObj {
        const data: T[] = [];
        if (this.$containsScalars) {
            for (let idx = 0; idx < this.length; idx++) {
                data[idx] = this[idx]!;
            }
        } else {
            for (let idx = 0; idx < this.length; idx++) {
                data[idx] = (this[idx] as IViewElement).$json() as unknown as T;
            }
        }
        return data as unknown as JsonObj;
    }

    public $clone(parent?: IViewElement): Setview<T> {
        const cloneObj = JSON.parse(JSON.stringify(this.$src.obj)) as T[];
        return new Setview<T>(cloneObj, parent, this.$src.type as AType);
    }

    public contains(item: T): boolean {
        return this.indexOf(item) > -1;
    }

    public $indexOfPath(path: string): number {
        if (isTextArray(path)) {
            return Number.parseInt(extractContent(path));
        }

        // const tt = (this.$src.type as Tarray).itemsTypeDef!.def as any;
        // const itemType = tt.type as string;

        // const idxObj = isTextObject(path)
        //     ? decodeKeyValues(path)
        //     : (tt as Tobject).buildIndexObjFromSelectorValue(decodeIndexValues(path));

        // for (let idx = 0; idx < this.length; idx++) {
        //     if (isMatchingIndexObj((this[idx] as IViewElement).$src.obj, idxObj)) {
        //         return idx;
        //     }
        // }
        for (let idx = 0; idx < this.length; idx++) {
            if (isMatchingSelector((this[idx] as IViewElement), path)) {
                return idx;
            }
        }
        return -1;
    }

    public $edit(withTracking: boolean = true, doNotification: boolean = true): SetviewEditor<T> {
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
     * @param local (default: false) when 'true' changes are applied from current element otherwhy from the root element.
     * @returns this instance
     */
    public $endEdit(local: boolean = false, raiseNotif: boolean = true): this {
        if (this.$isEditing) {
            this.$editor!.endEdit(local, raiseNotif);
        }
        return this;
    }



    /**
     * Is the current item the root of the doc.
     */
    public $isRoot(): boolean {
        return this._parent_ === undefined;
    }
    public $newChild<Ta extends IViewElement>(initData?: any): Ta {
        const tt = (this.$src.type as Tarray).itemsTypeDef!.def as any;
        const itemType = tt.type as string;
        let child: Ta;
        switch (itemType) {
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
                const otype = tt.viewctor as ObjviewConstructor;
                child = new otype(initData, this) as Ta;
                break;
        }
        MetadataHelper.getTypeInfo(child)!.setPath(PATH_UNASSIGNED);
        // tt.prepare(child.$src.obj, this.$src.obj, PATH_UNASSIGNED);
        child.$edit(this.$tracking, false);
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
                this.$editor ??= new SetviewEditor(this, this.$src.obj);
                return;
                            
            case ElementNotifications.editing:
                this.$editor ??= new SetviewEditor(this, this.$src.obj);
                break;
            case ElementNotifications.cancelEdit:
            case ElementNotifications.endEdit:
                this.$validation.clear();
                this.$editor = undefined;
                break;
        }

        if (this.$tracking) {
            if( event == ElementNotifications.validation  ) {
                this.validate(ValidationScopes.Rule, undefined, false);
            } 
            this.$notifyEvent(event);
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
    /**
     * Doc parent item.
     */
    public $parent(): IViewElement {
        return this._parent_ || this;
    }

    public onViewChanged?: Observable<DataPayload>;

    public remove(input: T) {
        return this.$edit().remove(input);
    }

    public removeAt(index: number) {
        if (index < this.length) {
            this.remove(this[index]!);
        }
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

    public $release(): void {

        if (!this.$containsScalars && this.length > 0) {
            this.forEach((item) => (item as IViewElement).$release(), this);
        }
        this.$editor = undefined;
        this._parent_ = undefined;
        MetadataHelper.clearTypeInfo(this);
    }

    public $refresh(data: T[]): void {
        const src = this.$src;

        const atype = src.type as Tarray;
        if (!src.isRoot) {
            (this.$parent() as any).$refreshChild(pathFromParent(src.path), data);
        } else {
            atype.prepare(data, undefined, PATH_ROOT);

            const changeSet = [] as ChangeSet;

            if (this.$isEditing) {
                this.$editor!.writeChangeSet(changeSet);
                this.$editor!.cancelEdit();
            }

            src.obj = data;
            if (!atype.containsScalars) {
                this.forEach((value) => (value as IViewElement).$release());
            }
            this.splice(0);
            this.$src.obj = data;

            if (data && atype.itemsTypeDef!.kind === PropertyTypology.Scalar) {
                data.forEach((scalarValue) => this.push(scalarValue));
            } else {
                data.forEach((value, i) => {
                    atype.itemsTypeDef!.prepare(value, undefined, PATH_ROOT);
                    this.push(atype.itemsTypeDef!.readAsView(value, i, this));
                }, this);
            }

            if (changeSet.length > 0) {
                this.$edit().applyChangeSet(changeSet);
            }
        }
        this.$notify(ElementNotifications.dataChanged);
    }

    public $refreshChild(property: string, data: T): void {
        const src = this.$src;
        const atype = src.type as Tarray;
        if (!atype.containsScalars) {
            return;
        }
        const array = this.$src.obj as any[];

        const index = this.$indexOfPath(property);

        const oldData = (this[index] as IViewElement).$src.obj;
        const oldDataIndex = array.indexOf(oldData);
        if (oldData) {
            MetadataHelper.detach(oldData);
        }

        array[oldDataIndex] = data;
        const itemInfo = atype.itemsTypeDef!;
        itemInfo.prepare(array, data, property);

        if (index > -1) {
            this[index] = itemInfo.readAsView(data, oldDataIndex, this) as T;
        }
        this.$notify(ElementNotifications.dataChanged);
    }

    public validate(
        scope: ValidationScopes = ValidationScopes.State,
        scopeRef?: any,
        raiseNotif: boolean = true
    ): ValidationState {
        const type = this.$src.type;
        const validationContext = this.$validation;
        if (!this.$tracking) {
            return validationContext;
        }
        type.validate(this, scope, scopeRef);
        corelateValidationWithParents(this);
        validationContext.debug(type.title + ' - ' + scope, this.$isRoot());
        if (raiseNotif && scope !== ValidationScopes.Property ) {
            this.$notify(ElementNotifications.validation);
        }
        return validationContext;
    }

    public $asString(): string {
        const src = this.$src;
        if (src) {
            return `${src.type.title} - ${src.path}`;
        }
        return this.constructor.name;
    }
}

ArrayViewFactory.InitializeConstructor(Setview);
