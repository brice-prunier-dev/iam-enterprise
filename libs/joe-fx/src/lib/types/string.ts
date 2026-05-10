
import {
    StringAccessor,
    BaseType,
    ValidationHandler,
    StringDef,
    isString,
    isFunction,
    ValidationState,
    ValidationScopes,
    RuntimeError} from '../core';

RuntimeError.register('_strMinlength', (args) => {
    const min = args['minlength'];
    const actual = args['actualLength'];
    return `Should be at least ${min} chars long! (current length: ${actual})`;
});
RuntimeError.register('_strMaxlength', (args) => {
    const max = args['maxlength'];
    const actual = args['actualLength'];
    return `Should not be more then ${max} chars long! (current length: ${actual})`;
});

RuntimeError.register('_strPattern', (args) => {
    const patternModel = args['patternModel'];
    return `Should match ${patternModel } pattern!`;
});

RuntimeError.register('_strEnum', (args) => {
    const enums = args['enum'];
    return `Should be one of ${JSON.stringify(enums, null, 2)}!`;
});

/**
 * Schema for a string property value
 */
export class Tstring implements StringDef, BaseType {
    public containsScalars: boolean;
    public default: string | StringAccessor | undefined;
    public enum: readonly string[] | undefined;
    public maxlength: number | undefined;
    public minlength: number | undefined;
    public pattern: string;
    public patternModel: string;
    public patternRegExp: RegExp | undefined;
    public title
    public type = 'string' as const;

    constructor(options: StringDef, name?: string) {
        this.title = name ?? options.title;
        this.containsScalars = true;
        this.pattern = options.pattern ?? '';
        this.patternModel = options.patternModel ?? '';
        this.patternRegExp = options.pattern !== undefined ? new RegExp(options.pattern, 'i') : undefined;
        this.enum = options.enum ?? undefined;
        this.default = options.default ?? undefined;
        this.minlength = options.minlength ?? undefined;
        this.maxlength = options.maxlength ?? undefined;
    }

    /**
     *  Default value as string.
     */
    public defaultValue(): string | null {
        if (isFunction(this.default)) {
            const reader = this.default as StringAccessor;
            return reader();
        }
        return isString(this.default) ? (this.default as string) : null;
    }

    /**
     * Create a new Schema instance that takes the current options as defaultDef
     * and overrides the current definition with the ones past as parameters.
     * @param options    number's schema options to set on the current number schema.
     * @returns          New Schema instance with the current options plus the ones pass as parameter
     */
    public extendAs(title: string, options: Partial<StringDef>): Tstring {

        const newOptions: StringDef = {
            ...this,
            title: title,
            ...options
        };


        const instance = new Tstring(newOptions);
        return instance;
    }


    public validate(
        target: any,
        scope: ValidationScopes = ValidationScopes.State
    ): ValidationState {
        const validation = new ValidationHandler();
        if (!isString(target)) {
            validation.writeError('_badtype', {typedef: 'String'});
        } else {
            validation.writeError('_badtype', undefined);
            const str_value = target as string;
            if (this.pattern && !this.patternRegExp!.test(str_value)) {
                validation.writeError('_strPattern', {
                    pattern: this.title,
                    value: str_value,
                    patternModel: this.patternModel
                });
            }
            if (this.enum) {
                const str_values = str_value.split(',');
                for (const value of str_values) {
                    var trimValue = value.trim();
                    if(!this.enum.includes(trimValue) ) {
                        validation.writeError('_strEnum', {
                            value: trimValue,
                            enum: this.enum.slice()
                        });
                        break;
                    }
                }
            }
            if (this.minlength && str_value.length < this.minlength) {
                validation.writeError('_strMinlength', {
                    minlength: this.minlength,
                    actualLength: str_value.length
                });
            } else if (this.maxlength && str_value.length > this.maxlength) {
                validation.writeError('_strMaxlength', {
                    maxlength: this.maxlength,
                    actualLength: str_value.length
                });
            }
        }
        return validation;
    }
}
