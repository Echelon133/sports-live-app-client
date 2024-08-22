export type CountryInfo = {
  id: string,
  name: string,
  countryCode: string,
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
