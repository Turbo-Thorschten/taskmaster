import axios, { AxiosResponse } from 'axios'
import { Tool, ToolError } from '@/types/Tool'
import google from 'googlethis'
import { ChatOpenAI } from 'langchain/chat_models'
import { HumanChatMessage, SystemChatMessage } from 'langchain/schema'
import { chat } from '@/tools/googleTool'
import { TaskWorker } from '@/taskWorker'
interface Plan {
    description: string;
    subtasks: Plan[];
}

export class SubtaskExecutionTool implements Tool<string, string> {

    description = (): string => 'This tool is able to accomplish subtasks.'
    name = (): string => 'Subtask Execution Tool'
    argumentDescription = (): string => '<arg1>: The subtask to do'

    async call(arg: string[]): Promise<ToolError | string> {
        try {
            const taskWorker = new TaskWorker(arg[0]);
            await taskWorker.run()
            return Promise.resolve("The subtask was completed successfully")
        }
        catch (e) {
            return Promise.resolve(new ToolError("Subtask Execution Tool failed with the following error " + e))
        }
    }

}