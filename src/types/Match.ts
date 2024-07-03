export enum MatchStatus {
  NOT_STARTED = "NOT_STARTED",
  FIRST_HALF = "FIRST_HALF",
  HALF_TIME = "HALF_TIME",
  SECOND_HALF = "SECOND_HALF",
  FINISHED = "FINISHED",
  EXTRA_TIME = "EXTRA_TIME",
  PENALTIES = "PENALTIES",
  POSTPONED = "POSTPONED",
  ABANDONED = "ABANDONED",
}

export namespace MatchStatus {
  const stringMapping: Map<MatchStatus, string> = new Map([
    [MatchStatus.NOT_STARTED, "Not started"],
    [MatchStatus.FIRST_HALF, "First Half"],
    [MatchStatus.HALF_TIME, "Half Time"],
    [MatchStatus.SECOND_HALF, "Second Half"],
    [MatchStatus.FINISHED, "Finished"],
    [MatchStatus.EXTRA_TIME, "Extra Time"],
    [MatchStatus.PENALTIES, "Penalties"],
    [MatchStatus.POSTPONED, "Postponed"],
    [MatchStatus.ABANDONED, "Abandoned"],
  ]);

  export function format(status: MatchStatus | undefined): string | undefined {
    if (status === undefined) return ""
    return stringMapping.get(status);
  }
}

export enum MatchResult {
  NONE = "NONE",
  HOME_WIN = "HOME_WIN",
  AWAY_WIN = "AWAY_WIN",
  DRAW = "DRAW",
}

export type CompactTeamInfo = {
  id: string,
  name: string,
  crestUrl: string,
}

export type Score = {
  homeGoals: number,
  awayGoals: number,
}

export type VenueInfo = {
  id: string,
  name: string,
  capacity: number | null,
}

export type RefereeInfo = {
  id: string,
  name: string,
}

export type CompactTeamInfoOrNull = CompactTeamInfo | null;

export type CompactMatchInfo = {
  id: string,
  status: MatchStatus,
  result: MatchResult,
  competitionId: string,
  startTimeUTC: Date,
  homeTeam: CompactTeamInfoOrNull,
  awayTeam: CompactTeamInfoOrNull,
  halfTimeScoreInfo: Score,
  scoreInfo: Score,
  penaltiesInfo: Score
}

export type FullMatchInfo = CompactMatchInfo & {
  venue: VenueInfo | null,
  referee: RefereeInfo | null,
}

export namespace FullMatchInfo {
  export function fromJSON(json: any): FullMatchInfo {
    // custom reviver needed to correctly parse the format of dates 
    // received from the backend
    return JSON.parse(json, customUtcDateReviver);
  }
}

export function customUtcDateReviver(key: any, value: any): any {
  if (
    typeof key === 'string'
    && key === 'startTimeUTC'
    && typeof value === 'object') {

    // [year, month, day, hour, minute]
    const dateArray: number[] = value;
    const d = new Date()
    d.setUTCFullYear(dateArray[0])
    // months received from the backend are not 0 based
    d.setUTCMonth(dateArray[1] - 1)
    d.setUTCDate(dateArray[2])
    d.setUTCHours(dateArray[3])
    d.setUTCMinutes(dateArray[4])
    d.setUTCSeconds(0)
    d.setUTCMilliseconds(0)
    return d;
  }
  return value;
}

