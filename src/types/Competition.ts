import { CompactMatchInfo, customUtcDateReviver } from "./Match"

export type Competition = {
  id: string,
  name: string,
  season: string,
  logoUrl: string
}

export type CompetitionGroupedMatches = Map<string, CompactMatchInfo[]>

export namespace CompetitionGroupedMatches {
  export function fromJSON(json: any): CompetitionGroupedMatches {
    // custom reviver needed to correctly parse the format of dates 
    // received from the backend
    return new Map(Object.entries(JSON.parse(json, customUtcDateReviver)));
  }
}
