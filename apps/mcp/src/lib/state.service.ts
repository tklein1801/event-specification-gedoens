import { StatesService } from '@solace-labs/ep-openapi-node';
import type { LifecycleState } from '../schemas/Shared.schema';

export async function resolveStateId(state: LifecycleState): Promise<string> {
  const response = await StatesService.getStates({});
  const stateDTO = response.data?.find((candidate) => candidate.name === state);
  if (!stateDTO?.id) {
    throw new Error(`Lifecycle state not found: ${state}`);
  }
  return stateDTO.id;
}
