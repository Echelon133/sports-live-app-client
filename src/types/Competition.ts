import { CompactMatchInfo, customUtcDateReviver } from "./Match"

export type Competition = {
  id: string,
  name: string,
  season: string,
  logoUrl: string
}

export type CompetitionIdGroupedMatches = Map<string, CompactMatchInfo[]>
export type CompetitionGroupedMatches = Map<Competition, CompactMatchInfo[]>

export namespace CompetitionIdGroupedMatches {
  export function fromJSON(json: any): CompetitionIdGroupedMatches {
    // custom reviver needed to correctly parse the format of dates 
    // received from the backend
    return new Map(Object.entries(JSON.parse(json, customUtcDateReviver)));
  }
}
