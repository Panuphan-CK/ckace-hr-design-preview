import type {
  ExistingTargetRecord,
  MigrationTargetStore,
  PendingApprovalSourceRequest,
  TargetCreateInput,
  TargetCreateResult,
} from "./migration-contracts";

/** Deterministic store for migration integration tests; never connects to a database. */
export class InMemoryMigrationTargetStore implements MigrationTargetStore {
  private readonly records = new Map<string, ExistingTargetRecord>();
  private nextId = 1;
  pendingRequests: readonly PendingApprovalSourceRequest[] = [];
  readonly createdInputs: TargetCreateInput[] = [];

  async prepareRun(input: { readonly pendingRequests?: readonly PendingApprovalSourceRequest[] }): Promise<void> {
    this.pendingRequests = input.pendingRequests ?? [];
  }

  async findByProvenanceKey(
    provenanceKey: string,
  ): Promise<ExistingTargetRecord | null> {
    return this.records.get(provenanceKey) ?? null;
  }

  async create(input: TargetCreateInput): Promise<TargetCreateResult> {
    if (this.records.has(input.provenanceKey)) {
      throw new Error("Duplicate provenance key");
    }
    this.createdInputs.push(input);
    const targetEntityId = `memory-${this.nextId++}`;
    this.records.set(input.provenanceKey, {
      provenanceKey: input.provenanceKey,
      sourcePayloadHash: input.sourcePayloadHash,
      transformedPayloadHash: input.transformedPayloadHash,
      transformerVersion: input.transformerVersion,
      targetEntityType: input.targetEntityType,
      targetEntityId,
    });
    return { targetEntityId };
  }

  get size(): number {
    return this.records.size;
  }
}
