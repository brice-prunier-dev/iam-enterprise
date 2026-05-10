import {
    readPath,
    PropertyTypology,
    StringMap,
    ChangeSet,
    EStateChanges,
    ChangeItem,
    JoeLogger,
    isScalar,
    isBlank,
    MetadataHelper,
    IViewElement,
    IEditor,
    cacheValueAsValue,
    isAssigned,
    isDataAssigned,
    Property,
    ElementNotifications,
    clone
} from '../core';
import {Tobject} from '../types';
import {Objview} from './objview';

export class ObjviewEditor<T> implements IEditor {
    public readonly editCache: any | undefined;

    // private _state: EntityState = EntityState.Original;
    constructor(private _view: Objview<T>) {
        this.editCache = {};
    }

    public applyChangeSet(changeset: ChangeSet): void {
        if (changeset) {
            for (const change of changeset) {
                this._applyChange(change);
            }
        }
    }

    public cancelEdit(localBranch: boolean = false, raiseNotif: boolean = true) {
        if (!localBranch && !this._view.$src.detached) {
            const rootView = this._view.$root();
            rootView.$editor!.cancelEdit(true);
        } else {
            const src = this._view.$src;
            const type = src.type as Tobject<T>;
            JoeLogger.action('CANCEL EDIT', type.getLabel(this._view as T));
            const children = this._view.$children() as StringMap<IViewElement>;
            const childrenKeys = Object.keys(children);
            if (childrenKeys && childrenKeys.length > 0) {
                JoeLogger.indent();
                Object.keys(children).forEach((property) => {
                    // JoeLogger.debug(property);
                    const propInfo = type.allProperties[property as keyof T] as Property;
                    if (propInfo.kind !== PropertyTypology.Scalar) {
                        const value = children[property]!;
                        if (value.$isEditing) {
                            // JoeLogger.debug(property);
                            value.$editor!.cancelEdit(true, false);
                        }
                    }
                }, this);
                JoeLogger.unindent();
            }
            this._view.$validation.clear();
            this._view.$editor = undefined;
            if (raiseNotif) {
                this._view.$notify(ElementNotifications.cancelEdit);
            }
        }
    }

    public endEdit(localBranch: boolean = false, raiseNotif: boolean = true): void {
        if (!localBranch && !this._view.$src.detached) {
            const rootView = this._view.$root();
            rootView.$editor!.endEdit(true);
        } else {
            const src = this._view.$src;
            const type = src.type as Tobject<T>;
            JoeLogger.action('END EDIT', type.getLabel(this._view as T));
            if (src.detached && this.isPristine()) {
                return undefined;
            } else {
                JoeLogger.indent();
                const editedProps = Object.keys(this.editCache);
                if (editedProps && editedProps.length > 0) {
                    editedProps.forEach((property) => {
                        if (
                            type.allProperties[property as keyof T].kind === PropertyTypology.Scalar
                        ) {
                            // JoeLogger.debug(property);
                            src.write(property, cacheValueAsValue(this.editCache[property]));
                        }
                    }, this);
                    editedProps.forEach((property) => {
                        const propInfo = type.allProperties[property as keyof T];
                        if (propInfo.kind !== PropertyTypology.Scalar) {
                            const value = cacheValueAsValue(
                                this.editCache[property]
                            ) as IViewElement;
                            if (value) {
                                // JoeLogger.debug(property);
                                let valueObj = value.$src.obj;
                                if (value.$isEditing) {
                                    valueObj = value.$editor!.endEdit(true, false);
                                }
                                if (valueObj && !MetadataHelper.getTypeInfo(valueObj)?.attached) {
                                    type.prepare(valueObj, src.obj, property);
                                }
                                src.write(property, valueObj);
                            }
                        }
                    }, this);
                }
                const children = this._view.$children() as StringMap<IViewElement>;
                const childrenKeys = Object.keys(children);
                if (childrenKeys && childrenKeys.length > 0) {
                    childrenKeys.forEach((property) => {
                        // JoeLogger.debug(property);
                        const propInfo = type.allProperties[property as keyof T];
                        if (propInfo.kind !== PropertyTypology.Scalar) {
                            const entity = children[property] as IViewElement;
                            if (entity && entity.$isEditing) {
                                // JoeLogger.debug(property);
                                if (!propInfo.required && !entity.$editor?.isTouched()) {
                                    entity.$editor!.cancelEdit(true);
                                } else {
                                    entity.$editor!.endEdit(true, false);
                                    const entityScr = entity.$src;
                                    const entityObj = entityScr.obj;
                                    if (entityScr.attached) {
                                        type.prepare(entityObj, src.obj, property);
                                    } else {
                                        entityScr.setParentChildView(this._view, property);  
                                    }
                                    src.write(property, entityObj);
                                }
                            }
                        }
                    }, this);
                }
                this._view.$validation.clear();
                this._view.$editor = undefined;
                if (raiseNotif) {
                    this._view.$notify(ElementNotifications.endEdit);
                }
            }
        }
    }

    // public asDeleted(): void {
    //   this._state = EntityState.Deleted;
    // }

    // public asOriginal(): void {
    //   this._state = EntityState.Original;
    // }

    // public asNew(): void {
    //   this._state = EntityState.Added;
    // }
    public isDirty(property?: string): boolean {
        if (isBlank(property)) {
            return !this.isPristine();
        } else {
            return !isBlank(this.editCache[property!]);
        }
    }

    public isPristine(): boolean {
        const editKeys = Object.keys(this.editCache);
        return editKeys === undefined || editKeys.length === 0;
    }

    public isRequired(property: string): boolean {
        const type = this._view.$src.type as Tobject<T>;
        const propInfo = type.allProperties[property as keyof T];
        return isAssigned(propInfo) ? propInfo.required : false;
    }

    public isTouched(): boolean {
        if (!this.isPristine()) {
            return true;
        }
        const children = this._view.$children();
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

    public writeChangeSet(changeset: ChangeSet, paths?: [string, string]): void {
        const src = this._view.$src;
        const otype = src.type as Tobject<T>;
        const [relativePath, selector] = paths ?? src.parentRelativePathInfo(); ;
        if (this._view.$isRoot()) {
            const isNew = (src.type as Tobject).isNew(src.obj);
            
            if (isNew) {
                changeset.push({
                    $type: src.type.title,
                    op: EStateChanges.inserted,
                    path: relativePath,
                    value: this._view.$json(),
                    selector,
                    type: src.type.title,
                });
                return;
            }
        } else if (src.detached) {
            changeset.push({
                $type: src.type.title,
                op: EStateChanges.inserted,
                path: relativePath,
                value: this._view.$json(),
                selector,
                type: src.type.title,
            });
            return;
        }
        const dirtyViewKeys: string[] = [];

        if (this.isDirty()) {
            const dirtyKeys = Object.keys(this.editCache);
            const dirtyScalarKeys: StringMap<any> = {};
            let dirtyScalarKeysCount = 0;
            for (const dirtyKey of dirtyKeys) {
                const dirtyValue = this.editCache[dirtyKey];
                if (!isDataAssigned(dirtyValue)) {
                    dirtyScalarKeys[dirtyKey] = null;
                    dirtyScalarKeysCount++;
                } else if (isScalar(dirtyValue)) {
                    dirtyScalarKeys[dirtyKey] = dirtyValue;
                    dirtyScalarKeysCount++;
                } else if (MetadataHelper.asView(dirtyValue)) {
                    dirtyViewKeys.push(dirtyKey);
                }
            }
            if (dirtyScalarKeysCount > 0) {
                changeset.push({
                    $type: 'Scalar',
                    op: EStateChanges.updated,
                    path: src.docPath,
                    value: dirtyScalarKeys,
                    selector: '*',
                    type: 'Scalar',
                });
            }
            if (dirtyViewKeys.length) {
                for (const viewKey of dirtyViewKeys) {
                    const view = this.editCache[viewKey] as IViewElement;
                    if (view.$isEditing) {
                        view.$editor!.writeChangeSet(changeset, [src.docPath, viewKey]);
                    }
                }
            }
        }

        const children = this._view.$children();
        const childrenKeys = Object.keys(children);
        for (const childkey of childrenKeys) {
            if (-1 === dirtyViewKeys.indexOf(childkey)) {
                const child = children[childkey]!;
                const propInfo = otype.allProperties[childkey as keyof T]!;
                if(child) {
                    const childEditor = child.$editor;
                    if (child.$isEditing) {
                        if( Array.isArray(child)) {
                            child.$editor!.writeChangeSet(changeset, [src.docPath, childkey]);
                        } else if (!child.$editor!.isPristine()) {
                            child.$editor!.writeChangeSet(changeset, [src.docPath, childkey]);
                        }
                    }
                    
                } else {
                    const childTypeName = ( propInfo as any)['def']!.title;
                    changeset.push({
                        $type: childTypeName,
                        op: EStateChanges.deleted,
                        path: src.path,
                        value: clone(src.obj[childkey as keyof T]), // TODO: check if this is correct
                        selector: childkey,
                        type: childTypeName,
                    });
                }
            }
        }
    }

    private _applyChange(change: ChangeItem): void {
        const src = this._view.$src;
        if (change.path === src.docPath) {
            if (change.op === EStateChanges.updated || change.op === EStateChanges.inserted) {
                this._view.$assign(change.value);
            }
        } else {
            const root = this._view.$root() as IViewElement;
            const target = readPath(root, change.path) as IViewElement;
            if (target) {
                target.$edit().applyChangeSet([change]);
            }
        }
    }
}
