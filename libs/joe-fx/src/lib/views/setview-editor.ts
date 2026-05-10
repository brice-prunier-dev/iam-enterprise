import {
    wrapAsPositionSelector,
    decodeOneSelectorValue,
    readPath,
    AType,
    PropertyTypology,
    EditCache,
    ChangeSet,
    EStateChanges,
    Scalar,
    ChangeItem,
    MetadataHelper,
    IViewElement,
    IEditor,
    ISetElementOf,
    JoeLogger,
    SortComparer,
    isBlank,
    IndexableType,
    isMatchingIndexObj,
    BaseType,
    AnyDef,
    ValidationScopes,
    ElementNotifications} from '../core';
import {Tobject, Tarray, ArrayViewFactory} from '../types';
import {Objview} from './objview';

export function positionIndexInSortedList(
    element: any,
    array: any[],
    comparer: SortComparer,
    start?: number,
    end?: number
): number {
    if (array.length === 0) {
        return -1;
    }

    start = start || 0;
    end = end || array.length;
    const pivot = (start + end) >> 1; // should be faster than dividing by 2

    const c = comparer(element, array[pivot]);
    if (end - start <= 1) {
        return c === -1 ? start : end;
    }
    switch (c) {
        case -1:
            return positionIndexInSortedList(element, array, comparer, start, pivot);
        case 1:
            return positionIndexInSortedList(element, array, comparer, pivot, end);
        default:
            return pivot;
    }
}

export class SetviewEditor<T extends Scalar | IViewElement> implements IEditor {
    
    public readonly editCache: EditCache<[number, T][]>;
  
    public isSortArray: boolean;

    protected get hasScalarItems(): boolean {
        const type = this._view.$src.type as Tarray;
        return type.itemsTypeDef!.kind === PropertyTypology.Scalar;
    }

    public get hasDeletedItem(): boolean {
        return this.editCache.deleted.length > 0;
    }

    constructor(private _view: IViewElement & ISetElementOf<T> & Array<T>, private _obj: T[]) {
        this.editCache = {inserted: [], deleted: [], modified: []};
        const t = _view.$src.type as Tarray;
         this.isSortArray = t.hasObjectItems && (t.itemsTypeDef!.def as Tobject<T>).withIndex;
     
    }

    private _applyChange(change: ChangeItem, isRoot: boolean): void {
        const src = this._view.$src;
        const atype = src.type as Tarray;
        const scalarItems = atype.hasScalarItems;
        if (change.path === src.docPath) {
            switch (change.op) {
                case EStateChanges.inserted:
                    if (scalarItems) {
                        this._view.add(change.value as T, -1);
                    } else if (atype.isTuple) {
                        this._view.add(change.value, decodeOneSelectorValue(change.selector as string) as number);
                    } else if (atype.isMultiDimension) {
                        const newItemSet = this._view.$newChild();
                        this._view.add(newItemSet as T, -1);
                    } else {
                        const newItem = this._view.$newChild();
                        if (newItem instanceof Objview) {
                            newItem.$assign(change.value);
                        }
                        this._view.add(newItem as T, -1);
                    }
                    break;
                case EStateChanges.deleted:
                    if (scalarItems) {
                        this._view.remove(change.value as T);
                    } else {
                        this._view.removeAt(this._view.$indexOfPath(change.selector!));
                    }
                    break;
            }
            if (change.op === EStateChanges.updated || change.op === EStateChanges.inserted) {
                this._view.$assign(change.value, isRoot);
            }
        } else {
            const root = src.root().obj as IViewElement;
            const target = readPath(root, change.path) as IViewElement;
            if (target) {
                target.$edit().applyChangeSet([change]);
            }
        }
    }



    public add(input: T, index: number = -1): ISetElementOf<T> {
        if (this._view.indexOf(input) > -1) {
            return this._view;
        }
        let isRollback = false;
        const indexInfoIfDeleted = this.indexInfoOfDeletedItem(input);
        isRollback = indexInfoIfDeleted !== undefined;
        if (isRollback) {
            this.editCache.deleted.splice(indexInfoIfDeleted![1], 1);
            index = indexInfoIfDeleted![0] - 1
        }
        if (this.isSortArray) {
            const otype = (this._view.$src.type as Tarray).itemsTypeDef!.def as Tobject;
            const comparer = otype.index!.sort
                ? ArrayViewFactory.PropertiesComparer(otype.index!.sort as string[])
                : ArrayViewFactory.PropertiesComparer(otype.index!.id as string[]);
            index = this.getPushIndex(input as IViewElement, comparer);
        }

        if (index === -1) {
            index = this._view.push(input) -1;
        } else {
            this._view.splice(index, 0, input);
        }

        let path = wrapAsPositionSelector(index);
        if (!this._view.$containsScalars) {
            const tmp = input as any;
            const childView = tmp as IViewElement;
            if ((childView.$src.type as IndexableType).withIndex) {
                path = (childView.$src.type as IndexableType).getIndexPath(childView);
            }
            this._view.$src.setParentChildView(childView, path);
        }
        if (!isRollback) {
            this.editCache.inserted.push([index, input]);
        }
        this._view.validate(ValidationScopes.Property, path);

        this._view.$notify(ElementNotifications.dataChanged);
        return this._view;
    }

    public applyChangeSet(changeset: ChangeSet): void {
        let idx = 0;
        for (const change of changeset) {
            this._applyChange(change, idx === 0);
            idx++;
        }

    }

    public cancelEdit(localBrach: boolean = false, raiseNotif: boolean = true) {
        if (!localBrach) {
            const rootView = this._view.$root();
            rootView.$editor!.cancelEdit(true);
            rootView.validate(ValidationScopes.EnforceState);
        } else {
            const src = this._view.$src;
            const type = src.type as Tarray;

            if (type.hasObjectItems) {
                const elements = [
                    ...this._view,
                    ...this.editCache.deleted.map((d) => d[1])
                ];
                elements
                    .filter((value) => !this.isInsertedItem(value))
                    .filter((value) => (value as IViewElement).$isEditing)
                    .forEach((value) => (value as IViewElement).$editor!.cancelEdit(true, false), this);

                this._view.splice(0);
                this._obj.forEach(
                    (value) => this._view.push(elements.find((e) => (e as IViewElement).$src.obj === value) as T),
                    this
                );

                this.editCache.inserted.forEach(
                    (value) => (value[1] as IViewElement).$release(),
                    this
                );
            } else {
                this._view.splice(0);
                this._obj.forEach((value) => this._view.push(value), this);
            }
            this._view.$validation.clear();
            this._view.$editor = undefined;
            if (raiseNotif) {
                this._view.$notify(ElementNotifications.cancelEdit);
            }
        }


    }

    public endEdit(localBranch: boolean = false, raiseNotif: boolean = true): void {
        if (!localBranch) {
            const rootView = this._view.$root();
            rootView.$editor!.endEdit(true);
        } else {
            const type = this._view.$src.type as AType;
            JoeLogger.indent();
            JoeLogger.action('End Edit', type.title);

            if (!this.hasScalarItems) {
                this._view.forEach((item: any) => {
                    const docElement = item as IViewElement;
                    if (docElement.$isEditing) {
                        docElement.$editor!.endEdit(true, false);
                    }
                });
            }
            this._obj.splice(0);
            if (this._view.length > 0) {
                if (this.hasScalarItems) {
                    this._view.forEach((s: T) => this._obj.push(s));
                } else {
                    (this._view as unknown as IViewElement[]).forEach(
                        (s) => this._obj.push(s.$src.obj),
                        this
                    );
                }
            }
            this._view.$notify(ElementNotifications.endEdit);
        }
    }

    public getIndexPath(item: any, index: number): string {
        return (this._view.$src.type as IndexableType).getIndexPath(item, index);
    }

    public getPushIndex(item: IViewElement, comparer: SortComparer): number {
        const array = this._view as any;
        return positionIndexInSortedList(item, array as IViewElement[], comparer);
    }

    public indexInfoOfDeletedItem(item: any): [number, number] | undefined {
        for (let index = 0; index < this.editCache.deleted.length; index++) {
            const rec = this.editCache.deleted[index]!;
            if (rec[1] === item) {
                return [rec[0], index];
            }
        }
        return undefined;
    }

    public indexInfoOfDeletedSourceItem(idxObj: {}): [number, T] | undefined {
        for (let index = 0; index < this.editCache.deleted.length; index++) {
            const rec = this.editCache.deleted[index]!;
            if (isMatchingIndexObj((rec[1] as IViewElement).$src.obj, idxObj)) {
                return rec;
            }
        }
        return undefined;
    }

    public indexInfoOfInsertedItem(item: any): [number, number] | undefined {
        for (let index = 0; index < this.editCache.inserted.length; index++) {
            const rec = this.editCache.inserted[index]!;
            if (rec[1] === item) {
                return [rec[0], index];
            }
        }
        return undefined;
    }

    public indexInfoOfModified(index: number): [number, T] | undefined {
        for (let index = 0; index < this.editCache.modified.length; index++) {
            const rec = this.editCache.modified[index]!;
            if (rec[0] === index) {
                return rec;
            }
        }
        return undefined;
    }

    public isDeletedItem(item: any): boolean {
        return this.editCache.deleted.some((i) => i[1] === item);
    }

    public isDirty(property?: string): boolean {
        if (isBlank(property)) {
            return !this.isPristine();
        } else {
            return (
                this.isInsertedItem(property) ||
                this.isDeletedItem(property) ||
                this.isModifiedItem(property)
            );
        }
    }

    public isInsertedItem(item: any): boolean {
        return this.editCache.inserted.some((i) => i[1] === item);
    }

    public isModifiedItem(item: any): boolean {
        return this.editCache.modified.some((i) => i[1] === item);
    }

    public isPristine(): boolean {
        return (
            this.editCache.inserted.length === 0 &&
            this.editCache.deleted.length === 0 &&
            this.editCache.modified.length === 0
        );
    }

    public isTouched(): boolean {
        if (!this.isPristine()) {
            return true;
        }
        const children = this._view.$children() as IViewElement[];
        for (const child of children) {
            if (child.$isEditing) {
                if (child.$editor!.isTouched()) {
                    return true;
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

    public remove(input: T): ISetElementOf<T> {
        const index = this._view.indexOf(input);
        if (index === -1) {
            return this._view;
        }
        const indexInfoIfInserted = this.indexInfoOfInsertedItem(input);
        let path = wrapAsPositionSelector(index);
        if (!this._view.$containsScalars) {
            const childView = input as IViewElement;
            if ((childView.$src.type as IndexableType).withIndex) {
                path = (childView.$src.type as IndexableType).getIndexPath(childView);
            }
        }
        let doRemove = index > -1;
        let registerRemove = isBlank(indexInfoIfInserted);
        if (doRemove && !registerRemove) {
            this.editCache.inserted.splice(indexInfoIfInserted![1], 1);
        }
        if (doRemove) {
            this._view.splice(index, 1);
            this._view.validate(ValidationScopes.RemoveChild, path);
            
        }
        if (registerRemove) {
            this.editCache.deleted.push([index, input]);

        }

        this._view.$notify(ElementNotifications.dataChanged);
        return this._view;
    }

    public update(index: number, input: T): ISetElementOf<T> {
        const src = this._view.$src;
        const atype = src.type as Tarray;
        if (atype.isTuple) {
            const modifRec = this.indexInfoOfModified(index);
            const valueType = (atype.itemsTypeDef!.def as (AnyDef & BaseType)[])[index] as AnyDef &
                BaseType;

            if (!valueType.containsScalars) {
                var oldItem = this._view[index] as IViewElement;
                oldItem.$src.unsetParent();
                this._view.$src.setParentChildView(input as IViewElement, wrapAsPositionSelector(index));
            }
            this._view[index] = input;
            if (modifRec) {
                modifRec[1] = input;
            } else {
                this.editCache.modified.push([index, input]);
            }
        }
        return this._view;
    }

    public validate(): string[] | undefined {
        return undefined;
    }

    public writeChangeSet(changeset: ChangeSet, paths?: [string, string]): void {
        const src = this._view.$src;
        const atype = src.type as Tarray;
        const [relativePath, selector] = paths ?? src.parentRelativePathInfo();
        const scalarItems = atype.hasScalarItems;
        const multiDim = atype.isMultiDimension;
        const childType = scalarItems
            ? (atype.items as AnyDef).type
            : multiDim
                ? "array"
                : (atype.items as AnyDef).title;

        if (this._view.$isRoot()) {
            const isNew = atype.isNew(src.obj);
            if (isNew) {
                changeset.push({
                    $type: childType,
                    op: EStateChanges.inserted,
                    path: relativePath,
                    value: this._view.$json(),
                    selector,
                    type: childType,
                });
                return;
            }
        } else if (src.detached) {
            changeset.push({
                $type: childType,
                op: EStateChanges.inserted,
                path: relativePath,
                value: this._view.$json(),
                selector,
                type: childType,
            });
            return;
        }
        if (this.editCache.deleted.length > 0) {
            for (const [deleletedIndex, deleletedView] of this.editCache.deleted) {
                if (scalarItems) {
                    changeset.push({
                        $type: childType,
                        op: EStateChanges.deleted,
                        path: this._view.$src.docPath,
                        selector: '_',
                        value: deleletedView,
                        type: childType,
                    });
                } else if (MetadataHelper.asView(deleletedView)) {
                    const delInfo = deleletedView.$src;
                    if ((delInfo.type as IndexableType).withIndex) {
                        changeset.push({
                            $type: childType,
                            op: EStateChanges.deleted,
                            path: this._view.$src.docPath,
                            selector: (delInfo.type as IndexableType).getIndexPath(
                                deleletedView,
                                deleletedIndex
                            ),
                            value: deleletedView.$json,
                            type: childType,
                        });
                    } else {
                        changeset.push({
                            $type: childType,
                            op: EStateChanges.deleted,
                            path: this._view.$src.docPath,
                            selector: wrapAsPositionSelector(deleletedIndex),
                            value: delInfo.obj,
                            type: childType,
                        });
                    }
                }
            }
        }
        if (scalarItems) {
            if (this.editCache.inserted.length > 0) {
                for (const [newScalarIndex, newScalarValue] of this.editCache.inserted) {
                    
                    changeset.push({
                        $type: childType,
                        op: EStateChanges.inserted,
                        path: this._view.$src.docPath,
                        selector: '_',
                        value: newScalarValue,
                        type: childType,
                    });
                }
            }
        } else {
            for (const viewItem of this._view as unknown as IViewElement[]) {
                if (viewItem.$isEditing) {
                    // const insertedIndexInfo = this.indexInfoOfInsertedItem(viewItem);

                    // viewItem.$editor!.writeChangeSet(changeset);
                    // if (isArrayAssigned(insertedIndexInfo)) {
                    //     const itemPayload = {
                    //         $type: childType,
                    //         op: EStateChanges.inserted,
                    //         path: viewItem.$src.path,
                    //         selector: atype.getIndexPath(viewItem, insertedIndexInfo![0]),
                    //         value: viewItem.$json(),
                    //         type: childType,
                    //     }
                    //     changeset.push(itemPayload);
                    // }
                    viewItem.$editor!.writeChangeSet(changeset);
                }
            }
        }
    }
}
