declare module '@virtuals-protocol/game' {
  export class GameFunction {
    constructor(config: {
      name: string;
      description: string;
      args: readonly { name: string; description: string }[];
      executable: (
        args: any,
        logger: (msg: string) => void,
      ) => Promise<ExecutableGameFunctionResponse>;
    });
  }

  export class GameWorker {
    constructor(config: {
      id: string;
      name: string;
      description: string;
      functions: GameFunction[];
    });
  }

  export class GameAgent {
    constructor(
      apiKey: string,
      config: {
        name: string;
        goal: string;
        description: string;
        workers: GameWorker[];
        llmModel: LLMModel;
      },
    );
    init(): Promise<void>;
    step(): Promise<{ data: any }>;
  }

  export enum LLMModel {
    DeepSeek_R1 = 'DeepSeek_R1',
  }

  export enum ExecutableGameFunctionStatus {
    Done = 'Done',
    Failed = 'Failed',
  }

  export class ExecutableGameFunctionResponse {
    constructor(status: ExecutableGameFunctionStatus, data: any);
  }
}
