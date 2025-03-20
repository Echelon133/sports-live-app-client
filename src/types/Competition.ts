import { CompactMatchInfo, CompactTeamInfoOrNull, MatchResult, Score, customUtcDateReviver } from "./Match"
import { FullTeamInfo } from "./Team";

export type CompetitionInfo = {
  id: string,
  name: string,
  season: string,
  logoUrl: string,
  leaguePhase: boolean,
  maxRounds: number,
  knockoutPhase: boolean
}

export type LabeledMatches = Map<string, CompactMatchInfo[]>;
export type GroupedMatches = { competition: CompetitionInfo, matches: CompactMatchInfo[] };

export namespace GroupedMatches {
  export function fromJSON(json: any): GroupedMatches[] {
    // custom reviver needed to correctly parse the format of dates 
    // received from the backend
    return JSON.parse(json, customUtcDateReviver);
  }
}

export namespace LabeledMatches {
  export function fromJSON(json: any): LabeledMatches {
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
    [LegendSentiment.POSITIVE_A, "bg-positive-a"],
    [LegendSentiment.POSITIVE_B, "bg-positive-b"],
    [LegendSentiment.POSITIVE_C, "bg-positive-c"],
    [LegendSentiment.POSITIVE_D, "bg-positive-d"],
    [LegendSentiment.NEGATIVE_A, "bg-negative-a"],
    [LegendSentiment.NEGATIVE_B, "bg-negative-b"],
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

export enum KnockoutStage {
  ROUND_OF_128 = "ROUND_OF_128",
  ROUND_OF_64 = "ROUND_OF_64",
  ROUND_OF_32 = "ROUND_OF_32",
  ROUND_OF_16 = "ROUND_OF_16",
  QUARTER_FINAL = "QUARTER_FINAL",
  SEMI_FINAL = "SEMI_FINAL",
  FINAL = "FINAL",
}

export namespace KnockoutStage {
  const stringMapping: Map<string, string> = new Map([
    ["ROUND_OF_128", "1/64-finals"],
    ["ROUND_OF_64", "1/32-finals"],
    ["ROUND_OF_32", "1/16-finals"],
    ["ROUND_OF_16", "1/8-finals"],
    ["QUARTER_FINAL", "Quarter-final"],
    ["SEMI_FINAL", "Semi-final"],
    ["FINAL", "Final"],
  ]);
  export function format(stage: string): string | undefined {
    if (stage === undefined) return ""
    return stringMapping.get(stage);
  }
}

export interface EmptySlot {
  type: "EMPTY"
}

export interface ByeSlot {
  type: "BYE",
  team: FullTeamInfo
}

export interface TakenSlot {
  type: "TAKEN",
  firstLeg: CompactMatchInfo,
  secondLeg: CompactMatchInfo | null
}

export type KnockoutStageSlot = EmptySlot | ByeSlot | TakenSlot;

export type StageEntry = {
  stage: KnockoutStage,
  slots: KnockoutStageSlot[]
}

export type KnockoutTree = {
  stages: StageEntry[]
}

export namespace KnockoutTree {
  export function fromJSON(json: any): KnockoutTree {
    // custom reviver needed to correctly parse the format of dates 
    // received from the backend
    return JSON.parse(json, customUtcDateReviver);
  }
}
