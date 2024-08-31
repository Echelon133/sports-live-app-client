import { CompactMatchInfo, CompactTeamInfoOrNull, MatchResult, Score, customUtcDateReviver } from "./Match"

export type CompetitionInfo = {
  id: string,
  name: string,
  season: string,
  logoUrl: string
}

export type CompetitionIdGroupedMatches = Map<string, CompactMatchInfo[]>
export type CompetitionGroupedMatches = Map<CompetitionInfo, CompactMatchInfo[]>

export namespace CompetitionIdGroupedMatches {
  export function fromJSON(json: any): CompetitionIdGroupedMatches {
    // custom reviver needed to correctly parse the format of dates 
    // received from the backend
    return new Map(Object.entries(JSON.parse(json, customUtcDateReviver)));
  }
}

export type TeamStanding = {
  teamId: string,
  teamName: string,
  crestUrl: string,
  matchesPlayed: number,
  wins: number,
  draws: number,
  losses: number,
  goalsScored: number,
  goalsConceded: number,
  points: number,
}

export type CompetitionGroupEntry = {
  name: string,
  teams: TeamStanding[],
}

export enum LegendSentiment {
  POSITIVE_A = "POSITIVE_A",
  POSITIVE_B = "POSITIVE_B",
  POSITIVE_C = "POSITIVE_C",
  POSITIVE_D = "POSITIVE_D",
  NEGATIVE_A = "NEGATIVE_A",
  NEGATIVE_B = "NEGATIVE_B",
}

export namespace LegendSentiment {
  const stringMapping: Map<LegendSentiment, string> = new Map([
    [LegendSentiment.POSITIVE_A, "bg-blue-900"],
    [LegendSentiment.POSITIVE_B, "bg-blue-600"],
    [LegendSentiment.POSITIVE_C, "bg-yellow-500"],
    [LegendSentiment.POSITIVE_D, "bg-purple-500"],
    [LegendSentiment.NEGATIVE_A, "bg-rose-500"],
    [LegendSentiment.NEGATIVE_B, "bg-rose-900"],
  ]);
  export function toColor(sentiment: LegendSentiment | undefined): string | undefined {
    if (sentiment === undefined) return ""
    return stringMapping.get(sentiment);
  }

  // create a mapping where every position described in legend entries points to a color which 
  // represents that position
  export function createPositionToColorMap(legendEntries: LegendEntry[]): Map<number, string> {
    let m = new Map();
    for (const legend of legendEntries) {
      for (const position of legend.positions) {
        m.set(position, LegendSentiment.toColor(legend.sentiment));
      }
    }
    return m;
  }
}

export type LegendEntry = {
  positions: number[],
  context: string,
  sentiment: LegendSentiment,
}

export type CompetitionStandings = {
  groups: CompetitionGroupEntry[],
  legend: LegendEntry[]
}

export type TeamFormEntry = {
  form: string,
  matchDetails: {
    id: string,
    result: MatchResult,
    startTimeUTC: Date,
    homeTeam: CompactTeamInfoOrNull,
    awayTeam: CompactTeamInfoOrNull,
    scoreInfo: Score,
  }
}

export namespace TeamFormEntries {
  export function fromJSON(json: any): TeamFormEntry[] {
    // custom reviver needed to correctly parse the format of dates 
    // received from the backend
    return JSON.parse(json, customUtcDateReviver);
  }
}

export type PlayerStatsEntry = {
  playerId: string,
  teamId: string,
  name: string,
  goals: number,
  assists: number,
  yellowCards: number,
  redCards: number,
}
