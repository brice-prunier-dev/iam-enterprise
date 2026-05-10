import {
    isFunction,
    isAssigned,
    isNumber,
    NumberAccessor,
    BaseType,
    NumberDef,
    ValidationHandler,
    ValidationState,
    ValidationScopes,
    RuntimeError
} from '../core';

export const NumberPattern = {
    INT: 'int',
    DOUBLE: 'double',
    UINT: 'unsigned-int-positive',
    UINT_STRICT: 'unsigned-int-positive',
    UDOUBLE: 'unsigned-double',
    UDOUBLE_STRICT: 'unsigned-double-positive'
};

export class Tnumber implements NumberDef, BaseType {
    readonly containsScalars: boolean;
    type: 'number';
    pattern: string;
    default: number | NumberAccessor | undefined;
    minimum: number | undefined;
    maximum: number | undefined;
    minexclusive: number | undefined;
    maxexclusive: number | undefined;
    title: string;
    constructor(options: NumberDef, name?: string) {
        if (options.pattern === NumberPattern.INT && options.title === 'number') {
            options.title = 'integer';
        }
        this.type = 'number';
        this.containsScalars = true;
        this.pattern = options.pattern ?? '';
        this.default = options.default ?? undefined;
        this.maximum = options.maximum ?? undefined;
        this.minexclusive = options.minexclusive ?? undefined;
        this.maxexclusive = options.maxexclusive ?? undefined;
        this.title = name ?? options.title;
    }


    /**
     * Create a new Schema instance that takes the current options as defaultDef
     * and overrides the current definition with the ones past as parameters.
     * @param options    number's schema options to set on the current number schema.
     * @returns          New Schema instance with the current options plus the ones pass as parameter
     */
    extendAs(title: string, options: Partial<NumberDef>): Tnumber {
        const newOptions: NumberDef = {
                    ...this,
                    title: title,
                    ...options
                };
        const instance = new Tnumber(newOptions);
        return instance;
    }

    defaultValue(): number | undefined {
        if (isNumber(this.default)) {
            return this.default as number;
        }

        if (isFunction(this.default)) {
            const numberAccessor = this.default as NumberAccessor;
            return numberAccessor();
        }
        return undefined;
    }

    public validate(
        target: any,
        scope: ValidationScopes = ValidationScopes.State
    ): ValidationState {
        const validation = new ValidationHandler();
        if (isAssigned(target)) {
            if (isNumber(target)) {
                const numValue = target as number;
                if (this.pattern === NumberPattern.INT && !Number.isInteger(target)) {
                    validation.writeError('_badtype', {typedef: 'Number', subtypedef: 'as int'});
                } else {
                    validation.writeError('_badtype', undefined);
                }
                if (this.minimum && numValue < this.minimum) {
                    validation.writeError('_numMinimum', {
                        minimum: this.minimum,
                        actualValue: numValue
                    });
                } else if (this.minexclusive && numValue <= this.minexclusive) {
                    validation.writeError('_numMinExclusive', {
                        minexclusive: this.minexclusive,
                        actualValue: numValue
                    });
                }
                if (this.maximum && numValue > this.maximum) {
                    validation.writeError('_numMaximum', {
                        maximum: this.maximum,
                        actualValue: numValue
                    });
                } else if (this.maxexclusive && numValue >= this.maxexclusive) {
                    validation.writeError('_numMaxExclusive', {
                        maxexclusive: this.maxexclusive,
                        actualValue: numValue
                    });
                }
            } else {
                validation.writeError('_badtype', {typedef: 'Number'});
            }
        }
        return validation;
    }
}

RuntimeError.register('_patternAsInt', () => {
    return `Should be a integer!`;
});
RuntimeError.register('_numMinimum', (args) => {
    const min = args['minimum'];
    return `Should be greater or equal to ${min}!`;
});
RuntimeError.register('_numMinExclusive', (args) => {
    const minEx = args['minExclusive'];
    return `Should be greater than ${minEx}!`;
});
RuntimeError.register('_numMaximum', (args) => {
    const max = args['maximum'];
    return `Should be lower or equal to ${max}!`;
});
RuntimeError.register('_numMaxExclusive', (args) => {
    const maxEx = args['maxExclusive'];
    return `Should be lower than ${maxEx}!`;
});
