import { validateEvidenceScope } from "./evidence-scope";
import { type ScopeContext, type SourceEvidence } from "./evidence-contracts";

export type EvidenceAdapterRequest = {
  categories?: string[];
};

export interface EvidenceAdapter {
  read(scope: ScopeContext, request?: EvidenceAdapterRequest): Promise<SourceEvidence[]>;
}

export type OfficialEvidenceAdapter = EvidenceAdapter;
export type RagEvidenceAdapterContract = EvidenceAdapter;
export type MemoryEvidenceAdapterContract = EvidenceAdapter;
export type ToolEvidenceAdapter = EvidenceAdapter;
export type HumanEvidenceAdapter = EvidenceAdapter;
export type SessionEvidenceAdapter = EvidenceAdapter;

class InMemoryEvidenceAdapterBase implements EvidenceAdapter {
  private readonly items: SourceEvidence[] = [];

  constructor(private readonly sourceTypes?: SourceEvidence["sourceType"][]) {}

  set(items: SourceEvidence[]): void {
    this.items.length = 0;
    this.items.push(...items);
  }

  add(item: SourceEvidence): void {
    this.items.push(item);
  }

  async read(scope: ScopeContext, request: EvidenceAdapterRequest = {}): Promise<SourceEvidence[]> {
    return this.items.filter((item) => {
      if (this.sourceTypes && !this.sourceTypes.includes(item.sourceType)) return false;
      if (request.categories && !request.categories.includes(item.category)) return false;
      return validateEvidenceScope(item, scope).valid;
    });
  }
}

export class InMemoryOfficialEvidenceAdapter
  extends InMemoryEvidenceAdapterBase
  implements OfficialEvidenceAdapter
{
  constructor() {
    super(["OFFICIAL_STRUCTURED", "OFFICIAL_DOCUMENT"]);
  }
}

export class InMemoryRagEvidenceAdapter
  extends InMemoryEvidenceAdapterBase
  implements RagEvidenceAdapterContract
{
  constructor() {
    super(["OFFICIAL_DOCUMENT", "RAG_DOCUMENT"]);
  }
}

export class InMemoryMemoryEvidenceAdapter
  extends InMemoryEvidenceAdapterBase
  implements MemoryEvidenceAdapterContract
{
  constructor() {
    super(["CONTACT_MEMORY", "TEMPORARY_MEMORY"]);
  }
}

export class InMemoryToolEvidenceAdapter
  extends InMemoryEvidenceAdapterBase
  implements ToolEvidenceAdapter
{
  constructor() {
    super(["TOOL_RESULT"]);
  }
}

export class InMemoryHumanEvidenceAdapter
  extends InMemoryEvidenceAdapterBase
  implements HumanEvidenceAdapter
{
  constructor() {
    super(["HUMAN_CONFIRMED"]);
  }
}

export class InMemorySessionEvidenceAdapter
  extends InMemoryEvidenceAdapterBase
  implements SessionEvidenceAdapter
{
  constructor() {
    super(["CUSTOMER_PROVIDED", "SESSION_FACT"]);
  }
}
