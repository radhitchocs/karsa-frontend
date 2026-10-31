import type { PresenterView } from '@/contracts/views';
import type { SessionCommandPayload } from '@/contracts/commands';

export type SendFn = (payload: SessionCommandPayload) => void;
export type { PresenterView };
