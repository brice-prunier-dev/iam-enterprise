import {Subject} from 'rxjs/internal/Subject';
import {
    PATH_ROOT,
    PATH_NEXT,
    IDataInfo,
    IViewElement,
    MetadataHelper,
    PATH_UNASSIGNED,
    StringMap,
    DataPayload,
    IElementContext
} from '../core';

import {Tobject, Tmap, Tarray} from '../types';

export type ElementType = Tobject | Tarray | Tmap;

export class DataInfo<T = any> implements IDataInfo<T> {
    private _obj: T;
    private _parent: DataInfo | undefined;
    private _path: string;
    // private _state: EntityState = EntityState.Original;
    private _type: ElementType;
    private _viewModel?: WeakRef<IElementContext>;

    constructor(obj: any, type: ElementType) {
        this._obj = obj;
        this._path = PATH_UNASSIGNED;
        this._type = type;
    }

    public get attached(): boolean {
        return this._path.indexOf(PATH_UNASSIGNED) === -1;
    }

    public get detached(): boolean {
        return this._path === undefined
            ? true
            : this._path === PATH_UNASSIGNED ||
            this._path.startsWith(PATH_UNASSIGNED) ||
            this._path.includes(PATH_NEXT + PATH_UNASSIGNED + PATH_NEXT) ||
            this._path.endsWith(PATH_NEXT + PATH_UNASSIGNED) ||
            this._path.endsWith(PATH_NEXT + '[' + PATH_UNASSIGNED + ']');
    }

    public get isArray(): boolean {
        return this._type.type === 'array';
    }

    public get isMap(): boolean {
        return this._type.type === 'map';
    }

    public get isObject(): boolean {
        return this._type.type === 'object';
    }

    public get isRoot(): boolean {
        return this._path === PATH_ROOT;
    }

    public get obj(): T {
        return this._obj;
    }

    // public set obj(value:  any ) {
    //     this._obj = value;
    // }
    public get parent(): IDataInfo {
        return this._parent || this;
    }

    public get path(): string {
        return this._path;
    }

    public get type(): ElementType {
        return this._type as ElementType;
    }

    public get viewModel(): IElementContext | undefined {
        return this._viewModel === undefined ? undefined : this._viewModel.deref();
    }

    public set viewModel(value: IElementContext | undefined) {
        if (value === undefined) {
            this._viewModel = undefined;
        } else {
            this._viewModel ??= new WeakRef(value);
        }
    }

    public get withParent(): boolean {
        return this.parent !== this;
    }

    public get docPath(): string {
        const parentPath = this.withParent
            ? this.parent.docPath + PATH_NEXT
            : '';
        return parentPath + this._path;
    }

    public parentRelativePathInfo(): [string, string | undefined] {
        return this.withParent
            ? [this.parent.docPath, this._path]
            : [this._path, undefined];
    }

    public keyIndex(key: any): string {
        return this._path + PATH_NEXT + '[' + JSON.stringify(key).replace(/"/g, '') + ']';
    }

    /**
     * release all the referenced instance.
     */
    public release(): void {
        if (this._obj !== undefined) {
            (this._obj as any) = undefined;
        }
        this._parent = undefined;
    }

    /**
     * Retrieve the root intance of the hierarchy.
     */
    public root(): DataInfo {
        let parent: DataInfo = this;
        while (parent._path !== PATH_ROOT && parent._parent !== undefined) {
            parent = parent._parent;
        }
        return parent;
    }

    public setParent(path: string, parent: DataInfo) {
        this._path = path;
        this._parent = parent;
    }

    public setParentChildView(childView: IViewElement, path: string = PATH_ROOT) {
        const childDataInfo = childView.$src;
        childDataInfo.setParent(path, this as IDataInfo);
    }

    public setPath(path: string) {
        this._path = path;
    }

    public unsetParent(): this {
        this._path = PATH_UNASSIGNED;
        this._parent = undefined;
        return this;
    }

    public write(property: string, value: any) {
        const prevValue = (this.obj as any)[property];
        (this.obj as any)[property] = value;
        switch (this._type.type) {
            case 'array':
            case 'object':
                if (prevValue !== value) {
                    MetadataHelper.detach(prevValue);
                }
                break;
            case 'map':
                if (!value) {
                    delete (this.obj as any)[property];
                }
                if (prevValue !== value) {
                    MetadataHelper.detach(prevValue);
                }
                break;
        }
    }
}

MetadataHelper.initTypeInfoFactory(DataInfo);
