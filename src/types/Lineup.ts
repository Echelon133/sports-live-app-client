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

export namespace PlayerPosition {
  const stringMapping: Map<PlayerPosition, string> = new Map([
    [PlayerPosition.GOALKEEPER, "GK"],
    [PlayerPosition.DEFENDER, "DEF"],
    [PlayerPosition.MIDFIELDER, "MID"],
    [PlayerPosition.FORWARD, "FWD"]
  ]);
  export function format(position: PlayerPosition | undefined): string | undefined {
    if (position === undefined) return ""
    return stringMapping.get(position);
  }
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
  formation: String | null,
}

export interface Lineup {
  home: TeamLineup,
  away: TeamLineup,
}
