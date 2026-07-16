import type { PrismaService } from "../database/prisma.service";
import { ChatwootInboxConfigService } from "../chatwoot/chatwoot-inbox-config.service";
import {
  OperationalChatwootHandoffAdapter,
  resolveChatwootHandoffAdapter,
  type OperationalChatwootHandoffAdapterOptions,
} from "./operational-chatwoot-handoff-adapter";
import {
  RuntimeV2ControlledHandoffCommand,
  type ControlledHandoffCommandDependencies,
  type ControlledHandoffCommandInput,
  type ControlledHandoffCommandResult,
} from "./controlled-handoff-command";
import {
  ControlledChatwootReferenceResolver,
  type ControlledChatwootReference,
} from "./controlled-chatwoot-reference";
import type { ConversationStateStore } from "./conversation-state-store";
import type { HandoffRequest, HandoffStateScope } from "./handoff-state";
import type { ChatwootHandoffAdapter } from "./chatwoot-handoff-executor";

export type ControlledHandoffCommandRunnerDependencies = Pick<
  ControlledHandoffCommandDependencies,
  "stateStore" | "now" | "environment"
> & {
  resolveConfigurationReference: (
    scope: HandoffStateScope,
  ) => ControlledChatwootReference | null | Promise<ControlledChatwootReference | null>;
  resolveAdapter: (input: {
    environment: NodeJS.ProcessEnv;
    scope: HandoffStateScope;
    handoff: HandoffRequest;
  }) => ChatwootHandoffAdapter | null | Promise<ChatwootHandoffAdapter | null>;
};

export class ControlledHandoffCommandRunner {
  private readonly command: RuntimeV2ControlledHandoffCommand;

  constructor(dependencies: ControlledHandoffCommandRunnerDependencies) {
    this.command = new RuntimeV2ControlledHandoffCommand(dependencies);
  }

  run(input: ControlledHandoffCommandInput): Promise<ControlledHandoffCommandResult> {
    return this.command.run(input);
  }
}

export type OperationalControlledHandoffCommandRunnerInput = {
  stateStore: ConversationStateStore;
  prisma: PrismaService;
  chatwootInboxConfigService: ChatwootInboxConfigService;
  environment?: NodeJS.ProcessEnv;
  now?: () => Date;
  adapterOptions?: OperationalChatwootHandoffAdapterOptions;
};

export function createOperationalControlledHandoffRunner(
  input: OperationalControlledHandoffCommandRunnerInput,
): ControlledHandoffCommandRunner {
  const referenceResolver = new ControlledChatwootReferenceResolver(
    input.prisma,
    input.chatwootInboxConfigService,
  );

  return new ControlledHandoffCommandRunner({
    stateStore: input.stateStore,
    environment: input.environment,
    now: input.now,
    resolveConfigurationReference: (scope) => referenceResolver.resolve(scope),
    resolveAdapter: ({ environment, scope, handoff }) => {
      const resolution = resolveChatwootHandoffAdapter({
        environment,
        scope,
        handoff,
        createAdapter: () =>
          new OperationalChatwootHandoffAdapter(
            input.prisma,
            input.chatwootInboxConfigService,
            input.adapterOptions,
          ),
      });
      return resolution.adapter;
    },
  });
}
