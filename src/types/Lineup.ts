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
  export function format(position: PlayerPosition | undefined): string {
    if (position === undefined) return ""
    switch (position) {
      case PlayerPosition.GOALKEEPER:
        return "GK"
      case PlayerPosition.DEFENDER:
        return "DEF"
      case PlayerPosition.MIDFIELDER:
        return "MID"
      case PlayerPosition.FORWARD:
        return "FWD"
    }
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
  substitutePlayers: TeamPlayer[]
}

export interface Lineup {
  home: TeamLineup,
  away: TeamLineup,
}
