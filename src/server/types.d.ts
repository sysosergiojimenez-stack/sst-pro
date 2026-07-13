// Declaraciones de tipos para modulos sin tipos

declare module 'uuid' {
  export function v4(): string;
}

declare module '@google/generative-ai' {
  export class GoogleGenerativeAI {
    constructor(apiKey: string);
    getGenerativeModel(config: { model: string }): GenerativeModel;
  }

  export interface GenerativeModel {
    generateContent(parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>): Promise<GenerateContentResult>;
  }

  export interface GenerateContentResult {
    response: {
      text(): string;
    };
  }
}
