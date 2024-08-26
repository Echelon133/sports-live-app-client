export type CountryInfo = {
  id: string,
  name: string,
  countryCode: string,
}

export namespace CountryInfo {
  export function countryCodeToFlagEmoji(countryCode: string | undefined): string {
    if (countryCode === undefined) return ""
    if (countryCode.length != 2) return ""

    const regionalIndicatorSymbolA = 0x1f1e6;
    const upperCaseA = regionalIndicatorSymbolA - 0x41;
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((c) => c.codePointAt() + upperCaseA);
    return String.fromCodePoint(...codePoints)
  }
}

export type CoachInfo = {
  id: string,
  name: string,
}

export type FullTeamInfo = {
  id: string,
  name: string,
  crestUrl: string,
  country: CountryInfo | undefined,
  coach: CoachInfo | undefined,
}
