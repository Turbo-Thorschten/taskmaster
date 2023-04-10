import { Tool, ToolError } from '@/types/Tool'
import { exec } from "child_process";

export class RunCommandTool implements Tool<string, string> {

    description = (): string => 'This tool executes shell commands (windows).'
    name = (): string => 'cmd Shell Tool'
    argumentDescription = (): string => '<arg1>: The command to run on the powershell.'

    async call(arg: string[]): Promise<ToolError | string> {
        try {
            let list: string[] = []
            console.warn("Running command " + arg[0])
            try {
                exec(arg[0], (error, stdout, stderr) => {
                    if (error) {
                        list.push(`error: ${error.message}`)
                        console.log(`error: ${error.message}`);
                    }
                    if (stderr) {
                        list.push(`stderr: ${stderr}`)
                        console.log(`stderr: ${stderr}`);
                    }
                    if (stdout) {
                        list.push(`stdout: ${stdout}`)
                        console.log(`stdout: ${stdout}`);
                    }
                });
            }
            catch (e) {
                list.push("Could not run command " + arg[0] + " because " + e)
            }
            return Promise.resolve(list.length === 0 ? "The command executed successfully" : list.join("\n"))
        }
        catch (e) {
            return Promise.resolve(new ToolError("Could not search for " + arg[0]))
        }
    }

}