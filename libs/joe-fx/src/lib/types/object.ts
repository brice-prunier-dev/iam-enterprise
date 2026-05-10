import {
    asObject,
    asString,
    isAssigned,
    isStringAssigned,
    MetadataHelper,
    readTypeName,
    RuntimeMessage,
    RuntimeSummary,
    PATH_LOCAL,
    PATH_ROOT,
    AType,
    AnyDef,
    BaseType,
    IndexDef,
    MType,
    OType,
    ObjectDef,
    ObjviewConstructor,
    PropertiesInfo,
    PropertyTypology,
    StringMap,
    ValidationRule,
    Properties,
    ElementValidationState,
    PartialPropertiesDef,
    readPath,
    PATH_NEXT,
    isViewElement,
    AsyncValidationRule,
    XType,
    XObjectDef,
    Property,
    ElementTypeBehaviour,
    JsonObj,
    isArray,
    isBlank,
    asArray,
    ValidationState,
    ASYNCRULE_RUNNING_ERROR,
    isObjAssigned,
    normalizePath,
    PATH_UNASSIGNED,
    encodeSelector,
    wrapAsIndexSelector,
    ValidationScopes,
    RuntimeError,
    ElementNotifications,
    toPath,
    ElementMessageType,
    toArray,
    isDataAssigned,
    JsObject
} from '../core';

import {TobjectArrayItemProperty} from './object-property.array';
import {TobjectMapProperty} from './object-property.map';
import {TobjectSimpleProperty} from './object-property.simple';
import {TypeFactory} from './factory-type';
import {ObjectTypeFactory} from './factory-otype';
import {TxobjectSimpleProperty} from './object-property.xsimple';
import {corelateValidationWithParents} from './common';


function asSimplePath(path: string): string {
    return path.lastIndexOf(PATH_NEXT) < 2 && path.startsWith(PATH_LOCAL + PATH_NEXT)
        ? path.substring(2)
        : path;
}

RuntimeError.register('asyncrule', (args) => {
    return args['running'] === true
        ? `Asynchronous validation is running...`
        : `Runtime Error: ${args['error']}`;
});

RuntimeError.register('_indexrule', (args) => {
    return `Is not unique...`;
});

/**
 * Type definition for an Object.
 *
 * Reminder: An Object is an instance having properties at the opposite of an
 * Array that is a set of scalar values or Object references.
 * Tobject<T = any> is a class that receives on its constructor a type definition for a specific data interface
 *  and a name. It return an Tobtect<T> instance that will enforce the type validation for this scpecific interface.
 * @param typeDef {ObjectDef<T>} type definition for the data interface T
 */
export class Tobject<T = any> implements OType<T> {
    public readonly allProperties: Properties<T>;
    /**
     * 
     */
    public readonly containsScalars: boolean;

    public asyncrules: {[P in keyof T]?: AsyncValidationRule<T>} & {
        _?: AsyncValidationRule<T>;
    };
    public extends?: ObjectDef[];
    /**
     * Index definition :
     * 'id' fields goes fotsthe technical index
     * and
     * 'key' fiels goes for the business index.
     */
    public index?: IndexDef;
    public properties: PartialPropertiesDef<T>;
    public required: (keyof T)[];
    public rules: {[P in keyof T]?: ValidationRule<T>} & {_?: ValidationRule<T>};
    /**
     * Class name matching the object definition. 'title' matches with json schema specs.
     */
    public title: string;
    public type: 'object';
    public viewctor?: ObjviewConstructor;

    constructor(typeDef: ObjectDef<T>, name?: string) {
        this.type = 'object';
        this.containsScalars = false;
        this.title = name || typeDef.title;
        this.required = typeDef.required;
        this.properties = typeDef.properties;
        this.rules = {};
        this.asyncrules = {};
        const propertiesInfo: PropertiesInfo = {};
        const indexInfo: IndexDef = {id: ''};
        this._buildObjectType(typeDef.extends, propertiesInfo, indexInfo, this.required);
        this._buildPropertyType(typeDef.properties, propertiesInfo, this.required);

        this._buildObjectTypeIndex(indexInfo, typeDef.index);

        const propNames = Object.keys(propertiesInfo);
        const sortedPropNames = propNames.sort((a, b) => ~~(a > b));
        const properties: any = {};

        for (let i = 0; i < sortedPropNames.length; i++) {
            const propName = sortedPropNames[i]!;
            const propInfo = propertiesInfo[propName];
            properties[propName] = propInfo;
        }
        this.allProperties = properties;

        if (indexInfo.id) {
            this.index = indexInfo;
        }
    }

    public get withIndex(): boolean {
        return this.index !== undefined;
    }

    /**
      * return the index object
      * @example
      * index definition is { id: 'id'}
      * input `keyDef` is 5
      * return will be { id: 5 };
      * @example
      * index definition is { id: ['lastName', 'firstName']}
      * input `keyDef` is ['Doe', 'Jhon' ]
      * return will be { lastName: 'Doe', firstName: 'Jhon'};
      * * @example
      * index definition is { id: ['name>lastName', 'name>firstName']}
      * input `keyDef` is ['Doe', 'Jhon' ]
      * return will be { 'name>lastName': 'Doe', 'name>firstName': 'Jhon'};
      * @param keyDef values matching the index definition
      */
    public buildIndexObjFromSelectorValue(value: string | number | (string | number)[]): any {
        const index = {} as any;
        if (asArray<string | number>(value)) {
            (this.index!.id as string[]).forEach((p, idx) => (index[p] = value[idx]));
        } else {
            index[this.index!.id[0]!] = value;
        }

        return index;
    }

    public defaultValue(): any {
        const json: JsonObj = {};
        MetadataHelper.unsureTypeInfo(json, this);
        for (const propName in this.allProperties) {
            if (this.allProperties.hasOwnProperty(propName)) {
                const propDef = this.allProperties[propName];
                if (propDef.kind === PropertyTypology.Scalar) {
                    json[propName] = propDef.defaultValue();
                } else if (propDef.required) {
                    json[propName] = propDef.defaultValue();
                }
            }
        }
        // this.prepare(json);
        return json;
    }

    public fillValidationSummary(
        objErrors: StringMap,
        summary: RuntimeSummary,
        path: string
    ): RuntimeSummary {
        if (isObjAssigned(objErrors)) {
            for (const propertyName in objErrors) {
                if (objErrors.hasOwnProperty(propertyName)) {
                    const propertyErrors = objErrors[propertyName];
                    const propertyType = this.properties[propertyName as keyof T];
                    const propertyPath = toPath([path, propertyName]);

                    if (propertyType) {
                        if (Array.isArray(propertyType)) {
                            const propSchema0 = propertyType[0] as any;
                            if (propSchema0 && propSchema0.fillValidationSummary) {
                                propSchema0.fillValidationSummary(propertyErrors, summary, propertyPath);
                            }
                        } else {
                            const schema = propertyType as any;
                            if (schema.fillValidationSummary) {
                                schema.fillValidationSummary(propertyErrors, summary, propertyPath);
                            } else {
                                for (const propertyTypology in propertyErrors) {
                                    if (propertyErrors.hasOwnProperty(propertyTypology)) {
                                        const errorArgs = propertyErrors[propertyTypology];
                                        const msg = RuntimeError.errorText(propertyTypology, errorArgs);
                                        summary.push(
                                            new RuntimeMessage(
                                                msg,
                                                path,
                                                propertyName,
                                                ElementMessageType.Error
                                            )
                                        );
                                    }
                                }
                            }
                        }
                    } else {
                        // const errorDef = propertyErrors._;

                        // const msg = RuntimeError.errorText(propertyName, propertyErrors);
                        // summary.push(
                        //     new RuntimeMessage(
                        //         msg,
                        //         path, 
                        //         propertyName,
                        //         ElementMessageType.Error
                        //     )
                        // );

                        const selfErrors = objErrors['_'];
                        for (const selfErrorTypology in selfErrors) {
                            const errorArgs = selfErrors[selfErrorTypology];
                            const msg = RuntimeError.errorText(selfErrorTypology, errorArgs);
                            summary.push(
                                new RuntimeMessage(
                                    msg,
                                    path,
                                    propertyName,
                                    ElementMessageType.Error
                                )
                            );
                        }
                    }
                }
            }
        }
        return summary;
    }

    /**
     * Enforce single index value retrieval or raise an error
     * @param obj 
     * @returns 
     */
    public getId(obj: any): string | number {
        if (!this.withIndex) {
            throw console.error('No index definition for the current Element Type!');
        }
        const idDef = this.index!.id;

        if (idDef) {
            if (asString(idDef)) {
                return readPath<string | number>(obj, normalizePath(idDef))!;
            } else {
                if (idDef.length === 1) {
                    return readPath<string | number>(obj, normalizePath(idDef[0]!))!;
                } else {
                    throw console.error('Doc is a single id value !');
                }
            }
        }
        throw console.error('Doc is a single id value !');
    }

    /**
     * Return index obj {id: 'xxx'} from 'xxx'
     * @param obj from where index should be extract;
     */
    public getIndexObjFromValue(obj: any | any[]): JsonObj {
        const index: StringMap<any> = {};
        const idDef = this.index!.id;
        if (!idDef) {
            throw new Error('No index for ' + this.title);
        } else if (asString(idDef)) {
            index[normalizePath(idDef)] = obj;
        } else {
            if (idDef.length === 1) {
                const normalizedPath = normalizePath(idDef[0]!);
                index[normalizedPath] = isArray(obj) ? obj[0] : obj;
            } else {
                const idValues = obj as any[];
                idDef.forEach((idName, idx) => {
                    index[asSimplePath(idName)] = idValues[idx];
                });
            }
        }
        return index;
    }

    /**
     * return the pointer segment that to identify `obj` in a collection. 
     * @example
     * index definition is { id: 'id'}
     * input obj is { id: 5, firstName: 'Jhon', 'lastName': 'Doe'}
     * return will be '(#5)' };
     * @example
     * index definition is { id: ['lastName', 'firstName']}
     * input obj is { id: 5, firstName: 'Jhon', 'lastName': 'Doe'}
     * return will be '(Doe, Jhon)' };
     * @param obj reference the index path shoud identify,
     * @param index: default position index as fallback.
     */
    public getIndexPath(obj: JsObject | unknown, array?: unknown[]): string {
        const isView = isViewElement(obj);

        

        const indexVal = this.getIndexValue(obj);

        if (indexVal === null) {
            const info = isView ? obj.$json() : JSON.stringify(obj, null, 2);
            const errorText = `Index value is null on "${this.title}" instance: ${info}`;
            throw new Error(errorText);
        }

        return wrapAsIndexSelector(encodeSelector(indexVal));
    }

    /**
     * Return the index values for an element
     * 
     * @example
     * - index definition is { id: 'id'}
     * - input obj is { id: 5, firstName: 'Jhon', 'lastName': 'Doe'}
     * return will be 5;
     * 
     * @example
     * - index definition is { id: ['lastName', 'firstName']}
     * - input obj is { id: 5, firstName: 'Jhon', 'lastName': 'Doe'}
     * return will be ['Doe', 'Jhon' ];
     * 
     * @param keyDef values matching the index definition
     */
    public getIndexValue(obj: any): null | string | number | (string | number)[] {
        if (!this.withIndex) {
            return null;
        }
        const idDef = this.index!.id;

        if (idDef) {
            if (asString(idDef)) {
                return readPath<string | number>(obj, normalizePath(idDef))!;
            } else {
                if (idDef.length === 1) {
                    return readPath<string | number>(obj, normalizePath(idDef[0]!))!;
                } else {
                    return idDef.map<string | number>((s) => readPath<string | number>(obj, normalizePath(s))!);
                }
            }
        }
        return null;
    }

    public getLabel(obj: T): string {
        const isView = isViewElement(obj);
        if (this.index) {
            if (this.index.sort) {
                const sortValues = this.getSortValue(obj);
                var sortText = Array.isArray(sortValues)
                    ? sortValues.join(', ')
                    : '' + sortValues;
                return `${this.title} (${sortText})`;
            }

            if (this.index.id) {
                return `${this.title} ${this.getIndexPath(obj) ?? 'n/a'}`;
            }
        }
        const info = isView?obj.$json(): JSON.stringify(obj, null, 2);
        return `${this.title} (${info})`;
    }

    /**
     * Return the revision value of the input instance
     * @example 
     * - index definition is { id: 'id', rev: 'lastModificationDate'}
     * - input obj is { id: 5, lastModificationDate: '2023-01-01T01:01:01', ...}
     * return will be '2023-01-01T01:01:01';
     * @param obj reference 
     * @returns revison value, empty string if none, should be a string or a number.
     */
    public getRev(obj: any): null | string | number {
        return this.index && this.index.rev
            ? readPath<string | number>(obj, normalizePath(this.index.rev)) ?? null
            : null;
    }

    public getSortValue(obj: any): null | string | number | (string | number)[] {
        if (!this.withIndex) {
            return null;
        }
        const idDef = this.index!.sort;

        if (idDef) {
            if (asString(idDef)) {
                return readPath<string | number>(obj, normalizePath(idDef))!;
            } else {
                if (idDef.length === 1) {
                    return readPath<string | number>(obj, normalizePath(idDef[0]!))!;
                } else {
                    return idDef.map<string | number>((s) => readPath<string | number>(obj, normalizePath(s))!);
                }
            }
        }
        return null;
    }

    /**
     * Is the input obj a new created intance or is it loaded from the persistance layer
     * @param obj 
     * @returns new created instance flag.
     */
    public isNew(obj: any): boolean {
        const revDef = this.index?.rev;
        const idDef = this.index?.id;
        if (!isBlank(revDef)) {
            return isBlank(this.getRev(obj));
        } else if (!isBlank(idDef)) {
            return isBlank(this.getId(obj));
        } else {
            if (!isBlank(obj)) {
                for (const [propName, propInfo] of Object.entries(this.allProperties)) {
                    if ((propInfo as Property).required && isBlank(obj[propName])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * This method visit an Object graph and set for each Element (Object or Array) {@Link an Element metadata |IDataInfo.html} through a Symbol property.
     * Using a Symbol won't alter its Json serialization
     * The new DataInfo property provides several information about the json node type definiton:
     * - The type instance that rule the data object
     * - A reference to its parent if any
     * - The path that identify the node in the json hierarchy
     * @param target instance to prepare (required).
     * @param parent parent instance if any (optional).
     * @param path the path route of the current node in the hierarchy.
     */
    public prepare(obj: any, parent?: any, path: string = PATH_ROOT) {
        if (obj) {
            const notPrepared = MetadataHelper.isNotPrepared(obj);

            const objInfo = MetadataHelper.getTypeInfoSafe(obj, this);
            if (parent && (notPrepared || objInfo.detached)) {
                const parentInfo = MetadataHelper.getTypeInfo(parent)!;
                if (path != PATH_ROOT) {
                    if (parentInfo.isArray && this.withIndex && isDataAssigned(obj)) {
                        path = this.getIndexPath(obj);
                        if( path == '' ){
                            path = PATH_UNASSIGNED;
                        }
                    }
                }
                objInfo.setParent(path, parentInfo);
            } else if (!parent && (notPrepared || objInfo.detached)) {
                objInfo.setPath(PATH_ROOT);
            }
            if (notPrepared) {
                for (const [propName, propInfo] of Object.entries(this.allProperties)) {
                    if ((propInfo as unknown as ElementTypeBehaviour).prepare) {
                        (propInfo as unknown as ElementTypeBehaviour).prepare(
                            obj,
                            parent,
                            propName
                        );
                    }
                }
            }
        }
    }

    /**
     * Fluent index setting function
     */
    public setIndex(index: IndexDef): this {
        this.index = index;
        return this;
    }

    /**
     * Remove type metadata for the input object instance
     * @param obj instance having been {@link prepare | prepare}
     */
    public unprepare(obj: any) {
        if (obj && typeof obj === 'object') {
            const objInfo = MetadataHelper.getTypeInfo(obj);
            if (objInfo) {
                for (const [propName, propInfo] of Object.entries(this.allProperties)) {
                    if ((propInfo as unknown as ElementTypeBehaviour).unprepare) {
                        (propInfo as unknown as ElementTypeBehaviour).unprepare(obj[propName]);
                    }
                }

                objInfo.release();
                MetadataHelper.clearTypeInfo(obj);
            }
        }
    }

    /**
     * Validate 'subject' as 'T' type definition
     * @param subject input instace to validate
     * @param scope {@Link core#enums#ValidationScopes | Validation scope},
     * @param scopeRef (optional) extra parameter required by some validation scope 
     * @returns undefined when ok other why a map of the property in error {@Link core#validations#ValidationState | Validation Map},
     */
    public validate(
        subject: any,
        scope: ValidationScopes = ValidationScopes.State,
        scopeRef?: any
    ): ValidationState {
        const validationContext = isViewElement(subject)
            ? (subject.$validation as ElementValidationState<T>)
            : new ElementValidationState<T>();


        if (!validationContext.initialized || scope !== ValidationScopes.State) {
            if (asObject(subject)) {
                const typename = readTypeName(subject);
                const badtype =
                    typename !== 'object' && typename !== this.title
                        ? ({_badtype: {typedef: this.title}} as JsonObj)
                        : undefined;
                validationContext.setItemErrors('_', badtype);

                for (const [propName, propInfo] of Object.entries(this.allProperties)) {
                    if (validationContext.initialized
                        && scope === ValidationScopes.Property
                        && propName !== scopeRef) {
                        continue;
                    }

                    const propValue = subject[propName];
                    if (
                        validationContext.matchesRequiredConstraint(
                            propName as keyof T | '_',
                            (propInfo as Property).required,
                            propValue
                        )
                    ) {

                        if(!isBlank(propValue)){

                            const isOptionalPristineChild =
                                !(propInfo as Property).required &&
                                MetadataHelper.asView(propValue) &&
                                !propValue.$isRoot() &&
                                ((propValue.$isEditing && propValue.$editor!.isPristine()) ||
                                    !propValue.$isEditing);

                            if (!isOptionalPristineChild) {
                                (propInfo as Property).validate(
                                    validationContext,
                                    propValue,
                                    scope,
                                    propName
                                );
                            }
                        }
                    }
                }

                if (isObjAssigned(this.rules)) {
                    for (const [ruleTarget, validationRule] of Object.entries(this.rules)) {
                        if (isAssigned(validationRule) && ruleTarget !== '_') {
                            const prerequisits = [ruleTarget, ...toArray(validationRule.prerequisits)];
                            if (validationContext.matchPrerequisits(prerequisits)) {
                                validationContext.setItemErrors(
                                    ruleTarget,
                                    validationRule!.rule(subject as T)
                                );
                            }
                        }
                    }
                    if (this.rules._) {
                        const prerequisits = [...toArray(this.rules._.prerequisits)];
                        if (validationContext.matchPrerequisits(prerequisits)) {
                            validationContext.setItemErrors(
                                '_',
                                this.rules._!.rule(subject as T)
                            );
                        }
                    }
                }

            } else {
                validationContext.setItemErrors('_', {_badtype: {typedef: this.title}});
            }
        }
        validationContext.initialized = true;
        return validationContext;
    }

    /**
     * Check the validity of an object instance on the current schema.
     * @param subject instance to validate (required).
     * @returns ValidationResult, map of errors by property name;
     */
    public validateAsync(
        subject: any,
        scope: ValidationScopes = ValidationScopes.State,
        scopeRef?: string | boolean | object
    ): void {
        const validationContext = isViewElement(subject)
            ? (subject.$validation as ElementValidationState<T>)
            : new ElementValidationState<T>();

        const withScope = isStringAssigned(scopeRef);
        const withAsyncRules = isObjAssigned(this.asyncrules);
        if (withAsyncRules) {
            const keys = Object.keys(this.asyncrules);

            for (const asyncRuleName of keys) {
                const asyncValidationRule = (this.asyncrules as any)[asyncRuleName] as AsyncValidationRule<T>;

                if (
                    asyncRuleName === '_' ||
                    !withScope ||
                    (withScope && scopeRef === asyncRuleName)
                ) {
                    validationContext.setItemErrors(asyncRuleName, ASYNCRULE_RUNNING_ERROR);
                    if (MetadataHelper.asView(subject)) {
                        corelateValidationWithParents(subject);
                    }

                    asyncValidationRule(subject as T)
                        .then((asyncResult) => {
                            validationContext.setItemErrors(asyncRuleName, asyncResult);
                            if (MetadataHelper.asView(subject)) {
                                corelateValidationWithParents(subject);
                                subject.$notify(ElementNotifications.validation);
                            }
                        })
                        .catch((err) => {
                            validationContext.setItemErrors(asyncRuleName, {
                                asyncrule: {running: false, error: err}
                            } as JsonObj);
                            if (MetadataHelper.asView(subject)) {
                                corelateValidationWithParents(subject);
                                subject.$notify(ElementNotifications.validation);
                            }
                        });
                } else if (validationContext.errors[asyncRuleName] === undefined) {
                    validationContext.setItemErrors(asyncRuleName, ASYNCRULE_RUNNING_ERROR);
                    if (MetadataHelper.asView(subject)) {
                        corelateValidationWithParents(subject);
                        subject.$notify(ElementNotifications.validation);
                    }

                    asyncValidationRule(subject as T)
                        .then((asyncResult) => {
                            validationContext.setItemErrors(asyncRuleName, asyncResult);
                            if (MetadataHelper.asView(subject)) {
                                corelateValidationWithParents(subject);
                                subject.$notify(ElementNotifications.validation);
                            }
                        })
                        .catch((err) => {
                            validationContext.setItemErrors(asyncRuleName, {
                                asyncrule: {running: false, error: err}
                            } as JsonObj);
                            if (MetadataHelper.asView(subject)) {
                                corelateValidationWithParents(subject);
                                subject.$notify(ElementNotifications.validation);
                            }
                        });
                }
            }
        }
    }

    /**
     * Merge source properties into propertiesInfo map.
     * @param source : source object type.
     * @param propertiesInfo : property definition collector.
     */
    private static _importPropertyDefs<T>(
        source: OType<any>,
        propertiesInfo: PropertiesInfo
    ): void {
        for (const propName in source.allProperties) {
            if (propertiesInfo[propName] === undefined) {
                propertiesInfo[propName] = source.allProperties[propName]!;
            }
        }
    }

    /**
     * Create a PropertyInfo into a PropertiesInfo form one or few ObjectDef
     * @param exts input ObjectDef
     * @param propertiesInfo global PropertirsInfo context
     * @param indexInfo extra indefInfo
     */
    private _buildObjectType<T>(
        exts: ObjectDef[] | undefined,
        propertiesInfo: PropertiesInfo,
        indexInfo: IndexDef,
        required: (keyof T)[]
    ): void {
        if (exts) {
            exts.forEach((baseSch) => {
                if (baseSch instanceof Tobject) {
                    Tobject._importPropertyDefs<T>(baseSch, propertiesInfo);
                } else {
                    this._buildObjectType<T>(baseSch.extends, propertiesInfo, indexInfo, required);

                    this._buildPropertyType<T>(baseSch.properties, propertiesInfo, required);
                }
                this._buildObjectTypeIndex(indexInfo, baseSch.index);
            });
        }
    }

    /**
    * Merge any inherited or new index definition or index property.
    * @param index : Index Option.
    * @param def : Index definition.
    * @return : Index definition.
    */
    private _buildObjectTypeIndex(index: IndexDef, def?: IndexDef): void {
        // TODO : Gerer le cas d'extrends
        if (def) {
            index.id = asString(def.id)
                ? [normalizePath(def.id)]
                : def.id.map((s) => normalizePath(s));
            if (def.rev) {
                index.rev = normalizePath(def.rev);
            }
            if (def.sort) {
                index.sort = asString(def.sort) ? [def.sort] : def.sort;
            }
        }
    }

    /**
     * Merge input properties definition into propertiesInfo map.
     * @param propertiesDef : properties definition.
     * @param propertiesInfo : property definition collector.
     */
    private _buildPropertyType<T>(
        propertiesDef: PartialPropertiesDef<T>,
        propertiesInfo: PropertiesInfo,
        required: (keyof T)[]
    ): void {
        if (isAssigned(propertiesDef)) {
            for (const propName in propertiesDef) {
                // if (propertiesInfo[propName] === undefined) {
                const propDef = propertiesDef[propName];
                const propPair: [AnyDef, boolean] = [
                    propDef as AnyDef,
                    required.includes(propName as keyof T)
                ];
                if (TobjectMapProperty.Matches(propPair[0])) {
                    propertiesInfo[propName] = new TobjectMapProperty(
                        propName,
                        TypeFactory.TYPEDEF(propPair[0] as AnyDef) as MType,
                        propPair[1]
                    );
                } else if (TxobjectSimpleProperty.Matches(propPair[0])) {
                    propertiesInfo[propName] = new TxobjectSimpleProperty(
                        propName,
                        TypeFactory.XTYPEDEF(propPair[0] as XObjectDef) as XType,
                        propPair[1]
                    );
                } else if (TobjectSimpleProperty.Matches(propPair[0])) {
                    const simpleDef =
                        propPair[0].title === this.title
                            ? this
                            : (TypeFactory.TYPEDEF(propPair[0]) as AnyDef & BaseType);
                    propertiesInfo[propName] = new TobjectSimpleProperty(
                        propName,
                        simpleDef,
                        propPair[1]
                    );
                } else if (TobjectArrayItemProperty.Matches(propPair[0])) {
                    propertiesInfo[propName] = new TobjectArrayItemProperty(
                        propName,
                        TypeFactory.TYPEDEF(propPair[0] as AnyDef) as AType,
                        propPair[1]
                    );
                }
                // }
            }
        }
    }
}

ObjectTypeFactory.InitializeConstructor(Tobject);
