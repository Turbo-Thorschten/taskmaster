import axios, { AxiosResponse } from 'axios'
import { Tool, ToolError } from '@/types/Tool'
import { RecursiveCharacterTextSplitter, TokenTextSplitter } from 'langchain/text_splitter'
import { ChatOpenAI } from 'langchain/chat_models'
import { HumanChatMessage, SystemChatMessage } from 'langchain/schema'
import { compressKnowledge } from '@/taskWorker'
import * as cheerio from 'cheerio';

export class WriteDownThoughtTool implements Tool<string, string> {
    async call(arg: string[]): Promise<ToolError | string> {
        try {
            return "I had an important thought: " + arg[0];
        }
        catch (e) {
            console.warn(e);
            return `An error occurred writing down the thought: ${arg[0]}`
        }
    }


    description = (): string => "This tool browses accepts an important thought and writes it down so it won't be forgotten"
    name = (): string => 'Write Down Thought Tool'
    argumentDescription = (): string => '<arg1>: The thought to write down.'
}