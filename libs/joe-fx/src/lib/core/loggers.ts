/**
 * Custom logger that wrap console output to normalize logging.
 * 
 * @remarks JoeLogger constant.
 */
export class Logger {
    // #region Properties

    private static Blue = 'color: #2a7eff; ';
    private static Green = 'color: green;';
    private static Orange = 'color: orange;';
    private static Purple = 'color: #b6668e;';
    private static Bold = 'font-weight: bold; ';

    private _margin = 0;
    private _offset = ' ';

    public static Indentation = '   ';

    public env = '';
    /**
     * Flag that stop console writting
    */
    public isProd = false;

    // #endregion Properties

    // #region Constructors

    constructor() {}

    // #endregion Constructors

    // #region Public Methods

    /**
     * Green line having the following format: 'name -> detail'
     * @param name Action label.
     * @param detail Action detail 
     */
    public action(name: string, detail: any) {
        if (!this.isProd) {
            console.log('%c' + this._offset + name + ' -> ' + detail, Logger.Green);
        }
    }

    /**
     * Orange line with the following format: 'name: value (JSON.stringify)'
     * @param name Data name.
     * @param value Data value 
     */
    public data(name: string, value: any) {
        if (typeof value === 'object') {
            console.log(
                '%c' + this._offset + name + ': ' + JSON.stringify(value, null, 2),
                Logger.Orange
            );
        } else {
            console.log('%c' + this._offset + name + ': ' + value, Logger.Orange);
        }
    }

    /**
     * Purple line having the following format: 'name: value (JSON.stringify)'
     * @param input Debug value.
     * @param indent Indentation flag: if true an offset is applied 
     */
    public debug(input: any, indent = false) {
        if (!this.isProd) {
            if (indent) {
                this.indent();
            }
            if (typeof input === 'string') {
                console.log('%c' + this._offset + input, Logger.Bold + Logger.Purple);
            } else {
                console.log('%c' + this._offset + JSON.stringify(input, null, 2), Logger.Purple);
            }
            if (indent) {
                this.unindent();
            }
        }
    }

    /**
     * Purple line having the following format: 'name: value (JSON.stringify)'
     * @param input Debug value.
     * @param indent Indentation flag: if true an offset is applied 
     */
    public debug2(inputFn: () => any, indent = false) {
        if (!this.isProd) {
            if (indent) {
                this.indent();
            }
            const input = inputFn();
            if (typeof input === 'string') {
                console.log('%c' + this._offset + input, Logger.Bold + Logger.Purple);
            } else {
                console.log('%c' + this._offset + JSON.stringify(input, null, 2), Logger.Purple);
            }
            if (indent) {
                this.unindent();
            }
        }
    }


    /**
     * Ends a group section
     */
    public endgroup() {
        if (!this.isProd) {
            console.groupEnd();
        }
    }

    /**
     * Error summary
     * @param err Error as string, object or Error.
     * @param title Context description.
     */
    public error(err: string | object | Error, title?: string) {
        const withTitle = title !== undefined;
        if (withTitle) {
            console.log('');
            console.error(this._offset + '######################');
            console.error(this._offset + title);
            this.indent();
        }
        if (err !== undefined) {
            if (err instanceof Error) {
                console.error(this._offset + err.name);
                console.error(this._offset + err.message);
                console.error(this._offset + err.stack);
            } else if (typeof err === 'string') {
                console.error(this._offset + err);
            } else {
                console.error(this._offset + JSON.stringify(err, null, 2));
            }
        } else {
            console.error(this._offset + 'null error!');
        }
        if (withTitle) {
            this.unindent();
        }
    }

    /**
     * Starts a group section
     */
    public group(label: string) {
        if (!this.isProd) {
            console.group(label);
        }
    }

    /**
     * Write section & message in a group
     * @param section Section title.
     * @param message Section message
     */
    public groupedInfo(section: string, message: string | string[]) {
        if (!this.isProd) {
            console.group(section);
            console.log('%c' + message, Logger.Purple);

            console.groupEnd();
        }
    }

    /**
     *  Purple line message under a dot line
     * 
     * .........................;
     * 
     * {message}
     * @param message 
     */
    public header(message: string) {
        if (!this.isProd) {
            console.log(this._offset + '.........................');
            console.log('%c' + this._offset + message, Logger.Purple);
        }
    }

    /**
     * Increase summary offset
     */
    public indent() {
        this._margin++;
        this._offset += Logger.Indentation;
    }

    /**
     * Blue info line
     * @param input Info value (stringify)
     * @param indent Flag
     */
    public info(input: string | object, indent = false) {
        if (!this.isProd) {
            if (indent) {
                this.indent();
            }
            if (typeof input === 'string') {
                console.log('%c' + this._offset + input, Logger.Blue);
            } else {
                console.log('%c' + this._offset + JSON.stringify(input, null, 2), Logger.Blue);
            }
            if (indent) {
                this.unindent();
            }
        }
    }

    /**
     * Write Blue line  (stringify)
     * @param input Value
     * @param indent 
     */
    public log(input: string | object, indent = false) {
        if (!this.isProd) {
            if (indent) {
                this.indent();
            }
            if (typeof input === 'string') {
                console.log('%c' + this._offset + input, Logger.Blue);
            } else {
                console.log('%c' + this._offset + JSON.stringify(input, null, 2), Logger.Blue);
            }
            if (indent) {
                this.unindent();
            }
        }
    }

    /**
     * Reset offset summary.
     */
    public reset() {
        this._margin = 0;
        this._offset = ' ';
    }


    /**
     * Write a separator line.
     * 
     * ----------------------------;
     */
    public separator() {
        console.log(this._offset + '----------------------------');
        console.log('');
    }


    /**
     * Decrease summary offset.
     */
    public unindent() {
        if (this._margin > 1) {
            this._margin--;
            this._offset = '';
            for (let index = 0; index < this._margin; index++) {
                this._offset += Logger.Indentation;
            }
        } else {
            this.reset();
        }
    }

    // #endregion Public Methods
}

/**
 * Public Logger reference.
 */
export const JoeLogger = new Logger();
