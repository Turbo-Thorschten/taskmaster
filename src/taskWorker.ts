import { ITaskWorker } from '@/types/ITaskWorker'
import { Calculator } from 'langchain/tools'
import { Tool, ToolError } from '@/types/Tool'
import { BrowseTool } from '@/tools/browseTool'
import { GoogleTool } from '@/tools/googleTool'
import { PlanningTool } from '@/tools/planningTool'
import { FinishedTool } from '@/tools/finishedTool'
import { ChatOpenAI } from 'langchain/chat_models'
import { HumanChatMessage, SystemChatMessage } from 'langchain/schema'
import { encoding_for_model, Tiktoken, TiktokenModel } from '@dqbd/tiktoken'
import { getModelNameForTiktoken } from 'langchain/dist/base_language/count_tokens'
import chalk from 'chalk'
import { TEMPLATE_TOOL_RESPONSE } from 'langchain/dist/agents/chat_convo/prompt'
import { RunCommandTool } from '@/tools/runCommandTool'
import { WriteDownThoughtTool } from '@/tools/writeDownThoughtTool'
import { SubtaskExecutionTool } from '@/tools/taskworkerTool'

const tools: Tool<any, any>[] = [new BrowseTool(), new GoogleTool(), new PlanningTool(),
    new FinishedTool(), new RunCommandTool(), new WriteDownThoughtTool(), new SubtaskExecutionTool()]

const systemPrompt = `
You are a Manager AI. You use tools to accomplish tasks. You can use the following tools: 
${tools
    .map(
        tool => `
Tool name: ${tool.name()}
Tool description: ${tool.description()}
Tool arguments: ${tool.argumentDescription()}
`
    )
    .join('\n')}. 

You answer ONLY with a json object (corresponding to the tool to use). 
The schema of the object is { tool: string, arguments: string[], reason: string }. 
You have to always specify the tool, the arguments and the reason. 
The value of tool is the name of the tool you want to use.
The value of arguments are the arguments to pass to the tool. You MUST specify ALL arguments! 
The value of reason is how you think this tool will help you to accomplish the task. 
Do not repeat tool usage with the same or similar arguments. You can use the same tool multiple times with different arguments. 
You do not have to answer the question in one go. Gathering knowledge is almost as important as completing the task itself. 
You're answer should be the tool that is most likely be an important step on the way to eventually accomplish the task.
After you answer you will receive the result of the tool you used and be able to use another tool... and so on.

IMPORTANT: Double check that you only answer with a json object exactly as described above. If the user gives you
an empty Results of the tools you already used: -section, you have to start with the planning tool.`

export async function compressKnowledge(_acquiredKnowledge: string[]) {
    const chat = new ChatOpenAI({ modelName: 'gpt-4', verbose: true, maxTokens: 3000 })

    const systemMessage = new SystemChatMessage(`
    Compress the input you receive to 50% of the original size. Keep as many semantically 
    relevant parts as possible.Basically make the input half as long without losing too much information.`)
    systemMessage.name = 'AI'

    const humanMessage = new HumanChatMessage(_acquiredKnowledge.join('\n'))
    humanMessage.name = 'human'

    const compressedKnowledge = await chat.call([systemMessage, humanMessage])
    return compressedKnowledge.text
}

export function countTokens(modelName: string, text: string) {
    const encoding = encoding_for_model('gpt-4')

    const tokenized = encoding.encode(text)

    const numTokens = tokenized.length

    encoding.free()
    return numTokens
}

export class TaskWorker implements ITaskWorker {
    private readonly _task: string

    get task(): string {
        return this._task
    }

    constructor(task: string) {
        this._task = task
    }

    _acquiredKnowledge: string[] = []

    async run(): Promise<string> {
        try {
            const chat = new ChatOpenAI({ modelName: 'gpt-4', verbose: true, maxTokens: 1000 })

            const systemMessage = new SystemChatMessage(systemPrompt)
            systemMessage.name = 'AI'
            while (true) {
                let humanPrompt = `
                    ${this._task}
                
                    Do not repeat tool usage with the same or similar arguments. You can use the same tool multiple 
                    times with different arguments. Otherwise you will be punished. If you still detect that continue
                    with the planning tool to give you an idea how to proceed.
                
                    Results of the tools you already used:
                    ${this._acquiredKnowledge.join('__\n__')}`

                if (countTokens('gpt-4', humanPrompt) > 4000) {
                    humanPrompt = await compressKnowledge(this._acquiredKnowledge)
                }

                const humanMessage = new HumanChatMessage(humanPrompt)

                humanMessage.name = 'human'

                console.log(`
                Asking the AI to solve the task: ${this._task}
                System Prompt ${systemMessage.text} 
                User Prompt: ${humanMessage.text}`)

                const response = await chat.call([systemMessage, humanMessage])

                const toolRequest: { tool: string; arguments: string[]; reason: string } = JSON.parse(response.text.replace(/[\r\n]+/g, ''))
                console.log(chalk.yellow('Using tool: ', toolRequest.tool + ' with arguments: ' + toolRequest.arguments + ' because: ' + toolRequest.reason))
                const tool = tools.find(tool => tool.name() === toolRequest.tool)
                if (tool === undefined) {
                    this._acquiredKnowledge.push(`
                        I tried to use a tool but an error occured because the tool does not exist: ${toolRequest.tool}
                        `)
                    continue
                }
                if (toolRequest.arguments === undefined) {
                    this._acquiredKnowledge.push(`
                        I used ${tool.name()} 
                        The thougt behind it was: 
                        ${toolRequest.reason}                 
                        The tool returned an error: No arguments specified for tool: ${toolRequest.tool}
                        `)
                    continue
                }
                if (toolRequest.arguments.length !== tool.argumentDescription().split('<').length - 1) {
                    this._acquiredKnowledge.push(`
                        I used ${tool.name()} 
                        The thougt behind it was: 
                        ${toolRequest.reason}                 
                        The tool returned an error: Wrong number of arguments for tool: ${toolRequest.tool}
                        `)
                    continue
                }

                const result = await tool.call(toolRequest.arguments)
                if (result instanceof ToolError) {
                    console.error(result.message)
                }

                console.log(result)

                this._acquiredKnowledge.push(`
                I used ${tool.name()} ${toolRequest.arguments}. 
                The thougt behind it was: 
                ${toolRequest.reason}                
                Result: 
                ${result.toString()}
                `)


                if (tool instanceof FinishedTool) {
                    const systemChatMessage = new SystemChatMessage("Summarize briefly how this AI accomplished the task")
                    systemChatMessage.name = "AI"
                    const humanChatMessage = new HumanChatMessage(this._acquiredKnowledge.join('\n'))
                    humanChatMessage.name = "human"
                    const summary = await chat.call([systemChatMessage, humanChatMessage])
                    return Promise.resolve(summary.text)
                }
            }
        } catch (e) {
            console.trace(e)
            return Promise.resolve("An error occured")
        }
    }
}
