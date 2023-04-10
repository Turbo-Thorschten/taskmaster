import axios, { AxiosResponse } from 'axios'
import { Tool, ToolError } from '@/types/Tool'
import google from 'googlethis'
import { ChatOpenAI } from 'langchain/chat_models'
import { HumanChatMessage, SystemChatMessage } from 'langchain/schema'
interface Plan {
    description: string;
    subtasks: Plan[];
}

export class FinishedTool implements Tool<string, void> {

    description = (): string => 'This tool must only be used if the task is entirely done. The task is done when the Subtask' +
        'Execution Tool has completed a tutorial step by step proposed by the Planning Tool.'
    name = (): string => 'Task Finished Tool'
    argumentDescription = (): string => '<arg1>: If the task was to answer a question, this is the answer. ' +
        'If the task was a command, this should be an empty string.'

    async call(arg: string[]): Promise<ToolError | void> {
        console.log("We are done with the task \n" + arg[0])
    }
}