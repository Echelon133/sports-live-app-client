import { MatchStatus } from "./Match"
import { MatchEventType } from "./MatchEvents"

export enum GlobalEventSide {
  HOME = "HOME",
  AWAY = "AWAY",
}

export interface GlobalStatusEvent {
  matchId: string,
  type: MatchEventType.STATUS,
  targetStatus: MatchStatus
}

export interface GlobalGoalEvent {
  matchId: string,
  type: MatchEventType.GOAL,
  side: GlobalEventSide
}

export interface GlobalRedCardEvent {
  matchId: string,
  type: MatchEventType.CARD,
  side: GlobalEventSide
}

export type GlobalMatchEvent = GlobalStatusEvent | GlobalGoalEvent | GlobalRedCardEvent;
