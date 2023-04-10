export class ToolError {
    private readonly _message: string;

    constructor(arg: string) {
        console.error(arg)
        this._message = arg;
    }

    public get message(): string {
        return this._message;
    }
}

export abstract class Tool<TArg, TResult> {
    abstract name(): string;
    abstract description(): string;
    abstract argumentDescription(): string;
    abstract call(arg: TArg[]): Promise<TResult | ToolError>;
}