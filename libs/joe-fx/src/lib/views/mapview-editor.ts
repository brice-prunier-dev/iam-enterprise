import {
    PropertyTypology,
    isBlank,
    StringMap,
    EditCache,
    ChangeSet,
    Scalar,
    JoeLogger,
    EStateChanges,
    MetadataHelper,
    IViewElement,
    IEditor,
    isEmptyObj,
    ValidationScopes,
    ElementNotifications,
    AnyDef,
    BaseType,
    ChangeItem,
    readPath} from '../core';
import {Tmap} from '../types';
import {Mapview} from './mapview';

export const MAPKEY: symbol = Symbol('__map-key__');
export class MapviewEditor<T extends Scalar | IViewElement> implements IEditor {
    private _mapType: Tmap;

    public readonly editCache: EditCache<StringMap<T>>;

    constructor(private _view: Mapview<T>, private _keys: string[]) {
        this._mapType = this._view.$src.type as Tmap;
        this.editCache = {inserted: {}, deleted: {}, modified: {}};
    }

    public get hasDeletedItem(): boolean {
        return !isEmptyObj(this.editCache.deleted);
    }

    protected get containsScalars(): boolean {
        return this._mapType.containsScalars
    }

    public applyChangeSet(changeset: ChangeSet): void {
        if (changeset) {
            for (const change of changeset) {
                this._applyChange(change);
            }
        }
    }

    public assign(key: string, keys: string[], view: T | undefined): void {
        const keyIndex = keys.indexOf(key);
        const [prevValue, prevStatus] = this.changeState(key);
        const mapview = this._view;
        const assignFunc = () => {
            if (keyIndex === -1) {
                keys.push(key);
            }
            mapview[key] = view!;
            if (!this.containsScalars) {
                (view as unknown as any)[MAPKEY] = key;
                const elementView = view as IViewElement;
                elementView.$src.setParent(key, mapview.$src);
                mapview.$src.setParentChildView(view as IViewElement, key);
            }
            mapview.validate(ValidationScopes.Property, key);
            mapview.$notify(ElementNotifications.dataChanged);
        };

        const clearFunc = () => {
            if (keyIndex > -1) {
                mapview.validate(ValidationScopes.RemoveChild, key);
                keys.splice(keyIndex, 1);
                delete mapview[key];
            }
            mapview.$notify(ElementNotifications.dataChanged);
        };

        switch (prevStatus) {
            case EStateChanges.none:
                if (prevValue) {
                    if (view !== prevValue) {
                        if (!view) {
                            this.editCache.deleted[key] = prevValue;
                            clearFunc();
                        } else {
                            this.editCache.modified[key] = view;
                            assignFunc();
                        }
                    }
                } else {
                    if (view) {
                        this.editCache.inserted[key] = view;
                        assignFunc();
                    }
                }
                break;
            case EStateChanges.inserted:
                if (view !== prevValue) {
                    if (!view) {
                        delete this.editCache.inserted[key];
                        clearFunc();
                    } else {
                        this.editCache.inserted[key] = view;
                        assignFunc();
                    }
                }
                break;
            case EStateChanges.updated:
                if (view !== prevValue) {
                    if (!view) {
                        delete this.editCache.modified[key];
                        this.editCache.deleted[key] = this.original(key);
                        clearFunc();
                    } else {
                        this.editCache.modified[key] = view;
                        assignFunc();
                    }
                }
                break;
            case EStateChanges.deleted:
                if (view) {
                    delete this.editCache.deleted[key];
                    if (view !== prevValue) {
                        this.editCache.modified[key] = view;
                    }
                    assignFunc();
                }
                break;
        }
    }

    // public isDeleted(): boolean {
    //   return this._state === EntityState.Deleted;
    // }
    public cancel(property: string) {
        if (this.editCache.inserted[property]) {
            delete this.editCache.inserted[property];
        }
        if (this.editCache.deleted[property]) {
            delete this.editCache.deleted[property];
        }
        if (this.editCache.modified[property]) {
            delete this.editCache.modified[property];
        }
    }

    public cancelEdit(localBranch: boolean = false, raiseNotif: boolean = true) {
        if (!localBranch) {
            const rootView = this._view.$root();
            rootView.$editor!.cancelEdit(true);
            rootView.validate(ValidationScopes.EnforceState);
        } else if (this.editCache) {
            const mapView = this._view as StringMap<T>;
            const src = this._view.$src;
            const editCache = this.editCache;
            Object.keys(editCache.inserted).forEach((k) => delete mapView[k]);
            Object.keys(editCache.deleted).forEach((k) => (mapView[k] = editCache.deleted[k] as T));
            this._keys = Object.keys(src.obj);
            if (!this.containsScalars) {
                this._keys.forEach((k) => {
                    const child = mapView[k] as IViewElement;
                    if (child && child.$isEditing) {
                        child.$editor!.cancelEdit(true, false);
                    }
                }, this);
            } else {
                this._keys.forEach((k) => (mapView[k] = src.obj[k]));
            }
            this._view.$validation.clear();
            this._view.$editor = undefined;
            if (raiseNotif) {
                this._view.$notify(ElementNotifications.cancelEdit);
            }
        }
    }

    public changeState(property: string): [T, EStateChanges] {
        let value = this.editCache.inserted[property];
        if (value) {
            return [value, EStateChanges.inserted];
        }
        value = this.editCache.deleted[property];
        if (value) {
            return [value, EStateChanges.deleted];
        }
        value = this.editCache.modified[property];
        if (value) {
            return [value, EStateChanges.updated];
        }
        return [this._view[property]!, EStateChanges.none];
    }

    public endEdit(localBranch: boolean = false, raiseNotif: boolean = true): void {
        if (!localBranch) {
            const rootView = this._view.$root();
            rootView.$editor!.endEdit(true);
        } else {
            const src = this._view.$src;
            const type = src.type as Tmap;
            const mapObj = src.obj;
            JoeLogger.indent();
            JoeLogger.action('End Edit', type.title);
            const deletedKeys = Object.keys(this.editCache.deleted) || [];
            deletedKeys.forEach((key) => src.write(key, undefined));

            const insertedKeys = Object.keys(this.editCache.inserted) || [];
            const modifiedKeys = Object.keys(this.editCache.modified) || [];
            if (this.containsScalars) {
                insertedKeys.forEach((k) => {
                    const insertedScalar = this.editCache.inserted[k];
                    src.write(k, insertedScalar);
                });
                modifiedKeys.forEach((k) => {
                    const modifiedScalar = this.editCache.modified[k] as any;
                    src.write(k, modifiedScalar);
                });
            } else {
                insertedKeys.forEach((k) => {
                    const entity = this.editCache.inserted[k] as unknown as IViewElement;
                    if (entity.$isEditing) {
                        entity.$editor!.endEdit(true, false);
                        const entityScr = entity.$src;
                        const entityObj = entityScr.obj;

                        if (entityScr.attached) {
                            type.prepare(entityObj, mapObj, k);
                        }
                        src.write(k, entity);
                    }
                });

                modifiedKeys.forEach((k) => {
                    const entity = this.editCache.inserted[k] as unknown as IViewElement;
                    if (entity.$isEditing) {
                        entity.$editor!.endEdit(true, false);
                    }
                });
                this._keys.forEach((k) => {
                    const entity = this._view[k] as unknown as IViewElement;
                    if (entity.$isEditing) {
                        const child = entity.$editor!.endEdit(true, false);
                        src.write(k, child);
                    }
                });
            }
            if (raiseNotif) {
                this._view.$notify(ElementNotifications.endEdit);
            }
        }
    }

    public isDeletedItem(property: string): boolean {
        return this.editCache.deleted[property] !== undefined;
    }

    public isDirty(property?: string): boolean {
        if (isBlank(property)) {
            return !this.isPristine();
        } else {
            return (
                this.isInsertedItem(property!) ||
                this.isDeletedItem(property!) ||
                this.isModifiedItem(property!)
            );
        }
    }

    public isInsertedItem(property: string): boolean {
        return this.editCache.inserted[property] !== undefined;
    }

    public isModifiedItem(property: string): boolean {
        return this.editCache.modified[property] !== undefined;
    }

    public isPristine(): boolean {
        return (
            isEmptyObj(this.editCache.modified) &&
            isEmptyObj(this.editCache.inserted) &&
            isEmptyObj(this.editCache.deleted)
        );
    }

    public isTouched(): boolean {
        if (!this.isPristine()) {
            return true;
        }
        const children = this._view.$children() as StringMap<IViewElement>;
        for (const childProp in children) {
            if (children.hasOwnProperty(childProp)) {
                const child = children[childProp]!;
                if (child.$isEditing) {
                    if (child.$editor!.isTouched()) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public itemChangeState(item: any): EStateChanges {
        if (this.isInsertedItem(item)) {
            return EStateChanges.inserted;
        } else if (this.isDeletedItem(item)) {
            return EStateChanges.deleted;
        } else if (this.isModifiedItem(item)) {
            return EStateChanges.updated;
        }
        return EStateChanges.none;
    }

    public original(property: string): T {
        return this._view.$src.obj[property];
    }

    public set(key: string, keys: string[], view: T | undefined): void {
        const keyIndex = keys.indexOf(key);
        const [prevValue, prevStatus] = this.changeState(key);
        const mapview = this._view;
        const assignFunc = () => {
            if (keyIndex === -1) {
                keys.push(key);
            }
            mapview[key] = view!;
            if (!this.containsScalars) {
                (view as unknown as any)[MAPKEY] = key;
                const elementView = view as IViewElement;
                elementView.$src.setParent(key, mapview.$src);
                mapview.$src.setParentChildView(view as IViewElement, key);
            }
            mapview.validate(ValidationScopes.Property, key);
            mapview.$notify(ElementNotifications.dataChanged);
            
        };

        const clearFunc = () => {
            if (keyIndex > -1) {
                mapview.validate(ValidationScopes.RemoveChild, key);
                keys.splice(keyIndex, 1);
                delete mapview[key];
            }
             mapview.$notify(ElementNotifications.dataChanged);
            
            
        };

        switch (prevStatus) {
            case EStateChanges.none:
                if (prevValue) {
                    if (view !== prevValue) {
                        if (!view) {
                            this.editCache.deleted[key] = prevValue;
                            clearFunc();
                        } else {
                            this.editCache.modified[key] = view;
                            assignFunc();
                        }
                    }
                } else {
                    if (view) {
                        this.editCache.inserted[key] = view;
                        assignFunc();
                    }
                }
                break;
            case EStateChanges.inserted:
                if (view !== prevValue) {
                    if (!view) {
                        delete this.editCache.inserted[key];
                        clearFunc();
                    } else {
                        this.editCache.inserted[key] = view;
                        assignFunc();
                    }
                }
                break;
            case EStateChanges.updated:
                if (view !== prevValue) {
                    if (!view) {
                        delete this.editCache.modified[key];
                        this.editCache.deleted[key] = this.original(key);
                        clearFunc();
                    } else {
                        this.editCache.modified[key] = view;
                        assignFunc();
                    }
                }
                break;
            case EStateChanges.deleted:
                if (view) {
                    delete this.editCache.deleted[key];
                    if (view !== prevValue) {
                        this.editCache.modified[key] = view;
                    }
                    assignFunc();
                }
                break;
        }
    }

    public validate(): string[] | undefined {
        return undefined;
    }

    public writeChangeSet(changeset: ChangeSet, paths?: [string, string]): void {
        const src = this._view.$src;
        const [relativePath, selector] = paths ?? src.parentRelativePathInfo();
        if (this._view.$isRoot()) {
            const isNew = (src.type as Tmap).isNew(src.obj);
            if (isNew) {
                changeset.push({
                    $type: this._view.$src.type.title,
                    op: EStateChanges.inserted,
                    path: relativePath,
                    value: this._view.$json(),
                    selector,
                    type: this._view.$src.type.title,
                });
                return;
            }
        } else if (src.detached) {
            changeset.push({
                $type: this._view.$src.type.title,
                op: EStateChanges.inserted,
                path: paths![0]!,
                value: this._view.$json(),
                selector: paths![1]!,
                type: this._view.$src.type.title,
            });
            return;
        }
        if (this.isDirty()) {
            const atype = src.type as Tmap;
            const scalarItems = atype.itemsTypeDef!.kind === PropertyTypology.Scalar;
            const itemDef = atype.itemsTypeDef!.def;
            const itemType = scalarItems
                ? (itemDef as (AnyDef & BaseType)).type
                : (itemDef as (AnyDef & BaseType)).title

            // Write first deleted items
            const delKeys = Object.keys(this.editCache.deleted) || [];
            for (const delKey of delKeys) {
                const delvalue = this.editCache.deleted[delKey]!;
                changeset.push({
                    $type: itemType,
                    op: EStateChanges.deleted,
                    path: src.docPath,
                    selector: delKey,
                    value: scalarItems
                        ? delvalue
                        : (delvalue as IViewElement).$json(),
                    type: itemType
                });
            }

            // Write inserted items
            const newKeys = Object.keys(this.editCache.inserted) || [];
            for (const newKey of newKeys) {
                const newvalue = this.editCache.inserted[newKey];
                changeset.push({
                    $type: itemType,
                    op: EStateChanges.inserted,
                    path: src.docPath,
                    selector: newKey,
                    value: scalarItems
                        ? newvalue
                        : (newvalue as IViewElement).$json(),
                    type: itemType,
                });
                if (MetadataHelper.asView(newvalue) && newvalue.$isEditing) {
                    changeset.push({
                        $type: itemType,
                        op: EStateChanges.inserted,
                        path: src.docPath,
                        selector: newKey,
                        value: newvalue.$json(),
                        type: itemType,
                    });
                    if (newvalue.$isEditing) {
                        newvalue.$editor!.writeChangeSet(changeset, [src.docPath, newKey]);
                    }
                }
            }

            // Drill down updated items to write their changeset
            if (!scalarItems) {
                const updKeys = (Object.keys(src.obj) || [])
                    .filter(s => delKeys.some(d => d !== s));

                for (const updKey of updKeys) {
                    const updvalue = this._view[updKey] as IViewElement;
                    if (updvalue.$isEditing) {
                        updvalue.$editor!.writeChangeSet(changeset, [src.docPath, updKey]);
                    }
                }
            }
        }
    }

    private _applyChange(change: ChangeItem): void {
        const src = this._view.$src;
        if (change.path === src.docPath) {
            switch (change.op) {
                case EStateChanges.inserted:
                    if(isBlank(change.selector)) {
                        this._view.$assign(change.value);
                    } else {
                        this._view.set(change.selector!, change.value as T);
                    }
                break;
                case EStateChanges.deleted:
                    if(!isBlank(change.selector)) {
                        this._view.set(change.selector!, undefined);
                    }
                    break;
            }
        } else {
            const root = src.root().obj as IViewElement;
            const target = readPath(root, change.path) as IViewElement;
            if (target) {
                target.$edit().applyChangeSet([change]);
            }
        }
    }
}
