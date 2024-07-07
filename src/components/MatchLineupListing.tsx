import { Lineup, PlayerPosition, TeamPlayer } from "@/types/Lineup"
import { useEffect, useState } from "react"
import getConfig from "next/config";

const { publicRuntimeConfig } = getConfig();

const INITIAL_LINEUP = {
  home: {
    startingPlayers: [],
    substitutePlayers: [],
  },
  away: {
    startingPlayers: [],
    substitutePlayers: []
  }
};

export default function MatchLineupListing(props: { matchId: string | undefined }) {
  const [lineup, setLineup] = useState<Lineup>(INITIAL_LINEUP);

  useEffect(() => {
    if (props.matchId == undefined) {
      return;
    }

    const lineupsUrl = `${publicRuntimeConfig.MATCHES_BASE_URL}/${props.matchId}/lineups`;
    fetch(lineupsUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: Lineup = data;
        setLineup(d);
      });
  }, [props.matchId])

  return (
    <>
      <div className="mt-5 bg-rose-500">
        <span className="pl-8 font-extrabold">Lineups</span>
      </div>
      <NamedLineup
        title="Starting Players"
        players={zipPlayers(lineup.home.startingPlayers, lineup.away.startingPlayers)} />
      <NamedLineup
        title="Substitute Players"
        players={zipPlayers(lineup.home.substitutePlayers, lineup.away.substitutePlayers)} />
    </>
  )
}

type ZippedPlayers = {
  homePlayer: TeamPlayer | undefined,
  awayPlayer: TeamPlayer | undefined,
};

function zipPlayers(homePlayers: TeamPlayer[], awayPlayers: TeamPlayer[]): ZippedPlayers[] {
  const finalLength = Math.max(homePlayers.length, awayPlayers.length);
  let zippedPlayers: ZippedPlayers[] = []

  for (let i = 0; i < finalLength; i++) {
    const homePlayer = homePlayers[i];
    const awayPlayer = awayPlayers[i];
    zippedPlayers.push({ homePlayer: homePlayer, awayPlayer: awayPlayer })
  }
  return zippedPlayers
}

function NamedLineup(props: { title: string, players: ZippedPlayers[] }) {
  return (
    <>
      <div className="flex flex-row bg-rose-300 h-8 pt-2 shadow-sm shadow-black mb-2">
        <div className="">
          <span className="pl-10 float-left text-sm">{props.title}</span>
        </div>
      </div>
      <div className="flex flex-row">
        <LineupTable players={props.players} />
      </div>
    </>
  )
}

function LineupTable(props: { players: ZippedPlayers[] }) {
  return (
    <table className="basis-full table-auto mx-8 mb-10">
      <tbody className="">
        {props.players.map((e) => {
          return (
            <>
              <tr className="odd:bg-rose-300 even:bg-rose-200">
                <td className="font-mono font-extrabold">{e.homePlayer?.number}</td>
                <td>{countryCodeToFlagEmoji(e.homePlayer?.countryCode)}</td>
                <td className="text-xs text-gray-500">{PlayerPosition.format(e.homePlayer?.position)}</td>
                <td>{e.homePlayer?.player.name}</td>
                <td></td>
                <td className="float-right pr-2">{e.awayPlayer?.player.name}</td>
                <td className="text-xs text-gray-500">{PlayerPosition.format(e.awayPlayer?.position)}</td>
                <td>{countryCodeToFlagEmoji(e.awayPlayer?.countryCode)}</td>
                <td className="font-mono font-extrabold">{e.awayPlayer?.number}</td>
              </tr>
            </>
          )
        })}
      </tbody>
    </table>
  )
}

function countryCodeToFlagEmoji(countryCode: string | undefined): string {
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
