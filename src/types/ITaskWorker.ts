export interface ITaskWorker {
    task: string;
    run(): Promise<string>;
}