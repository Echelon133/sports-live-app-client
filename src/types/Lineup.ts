import { CardType } from "./MatchEvents";

export type PlayerDetail = {
  id: string,
  name: string,
  dateOfBirth: number[],
}

export enum PlayerPosition {
  GOALKEEPER = "GOALKEEPER",
  DEFENDER = "DEFENDER",
  MIDFIELDER = "MIDFIELDER",
  FORWARD = "FORWARD"
}

export type TeamPlayer = {
  id: string,
  position: PlayerPosition,
  number: number,
  countryCode: string,
  player: PlayerDetail
}

export type TeamLineup = {
  startingPlayers: TeamPlayer[],
  substitutePlayers: TeamPlayer[],
  formation: string | null,
}

export interface Lineup {
  home: TeamLineup,
  away: TeamLineup,
}

export type PlayerActivity = {
  goalCounter: number,
  ownGoalCounter: number,
  card: CardType | undefined,
  inSubstitution: boolean
}

export type PlayerActivityMap = Map<string, PlayerActivity>;

export function playerActivityGetOrDefault(
  playerActivity: PlayerActivityMap,
  playerId: string
): PlayerActivity {
  return playerActivity.get(playerId) ?? { goalCounter: 0, ownGoalCounter: 0, card: undefined, inSubstitution: false };
}
