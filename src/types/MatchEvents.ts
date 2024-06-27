import { MatchResult, MatchStatus, Score } from "./Match"

export type Player = {
  teamPlayerId: string,
  playerId: string,
  name: string,
}

export enum CardType {
  YELLOW = "YELLOW",
  SECOND_YELLOW = "SECOND_YELLOW",
  DIRECT_RED = "DIRECT_RED",
}

export enum MatchEventType {
  STATUS = "STATUS",
  GOAL = "GOAL",
  CARD = "CARD",
  SUBSTITUTION = "SUBSTITUTION",
  COMMENTARY = "COMMENTARY",
  PENALTY = "PENALTY"
}

export type TeamInfo = {
  homeTeamId: string,
  awayTeamId: string,
}

export interface StatusEvent {
  type: MatchEventType.STATUS,
  targetStatus: MatchStatus,
  minute: string,
  competitionId: string
  teams: TeamInfo,
  result: MatchResult,
  mainScore: Score,
}

export interface CommentaryEvent {
  type: MatchEventType.COMMENTARY,
  minute: string,
  competitionId: string
  message: string,
}

export interface CardEvent {
  type: MatchEventType.CARD,
  minute: string,
  competitionId: string
  teamId: string,
  cardType: CardType,
  cardedPlayer: Player,
}

export interface GoalEvent {
  type: MatchEventType.GOAL,
  minute: string,
  competitionId: string
  teamId: string,
  scoringPlayer: Player,
  assistingPlayer: Player,
  ownGoal: boolean,
}

export interface SubstitutionEvent {
  type: MatchEventType.SUBSTITUTION,
  minute: string,
  competitionId: string
  teamId: string,
  playerIn: Player,
  playerOut: Player,
}

export interface PenaltyEvent {
  type: MatchEventType.PENALTY,
  minute: string,
  competitionId: string
  teamId: string,
  shootingPlayer: Player,
  countAsGoal: boolean,
  scored: boolean,
}

export type MatchEventInfo = StatusEvent | CommentaryEvent | CardEvent | GoalEvent | SubstitutionEvent | PenaltyEvent;

export type MatchEvent = {
  id: string,
  event: MatchEventInfo,
}
