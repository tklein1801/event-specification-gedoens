import { StatesService } from '@solace-labs/ep-openapi-node';
import type { LifecycleState } from '../schemas/Shared.schema';

type StatesResponse = Awaited<ReturnType<typeof StatesService.getStates>>;
type StateDTO = NonNullable<StatesResponse['data']>[number];

const CACHE_TTL_MS = 5 * 60_000;

let cachedStates: { fetchedAt: number; states: StateDTO[] } | undefined;

export function clearStateCache(): void {
  cachedStates = undefined;
}

async function getStates(): Promise<StateDTO[]> {
  if (cachedStates && Date.now() - cachedStates.fetchedAt < CACHE_TTL_MS) {
    return cachedStates.states;
  }

  const response = await StatesService.getStates({});
  const states = response.data ?? [];
  cachedStates = { fetchedAt: Date.now(), states };
  return states;
}

export async function resolveStateId(state: LifecycleState): Promise<string> {
  const stateDTO = (await getStates()).find((candidate) => candidate.name === state);
  if (!stateDTO?.id) {
    throw new Error(`Lifecycle state not found: ${state}`);
  }
  return stateDTO.id;
}
