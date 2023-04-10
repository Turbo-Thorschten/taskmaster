import axios, { AxiosResponse } from 'axios'
import { Tool, ToolError } from '@/types/Tool'
import google from 'googlethis'
import { ChatOpenAI } from 'langchain/chat_models'
import { HumanChatMessage, SystemChatMessage } from 'langchain/schema'
import { chat } from '@/tools/googleTool'
interface Plan {
    description: string;
    subtasks: Plan[];
}

export class PlanningTool implements Tool<string, string> {

    description = (): string => "This tool takes a complex task and returns a step by step plan how to solve the task. Don't use this tool for simple tasks" +
        " that don't require a lot of planning."

    name = (): string => 'Task Planning Tool'
    argumentDescription = (): string => '<arg1>: The task to plan'

    systemPrompt = `You are a planning AI. The user gives you a task to plan and you divide
    that task into subtasks.`

    async call(arg: string[]): Promise<ToolError | string> {
        const chat = new ChatOpenAI({modelName: "gpt-3.5-turbo", verbose: true, maxTokens: 2000});

        try {

            const systemMessage = new SystemChatMessage(this.systemPrompt);
            systemMessage.name = "AI";
            const humanMessage = new HumanChatMessage(
                `Additional information that might be useful: ${arg[1] ?? 'none'}
                 Return multiple different routes for how to solve the task. The steps 
                 should be as small as possible, so that even a dumb person can follow.
                 Each route should be embedded in <tutorial></tutorial> tags.
                 Your task: ${arg[0]}`,
            );
            humanMessage.name = "human";

            const response = await chat.call([systemMessage, humanMessage]);
            // const rawResult = JSON.parse(response.text.replace(/[\r\n]+/g, ''));

            return Promise.resolve(response.text)
        }
        catch (e) {
            return Promise.resolve(new ToolError("Planning Tool failed and the following error occurred " + e))
        }
    }

}