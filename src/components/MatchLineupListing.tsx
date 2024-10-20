import { Lineup, PlayerPosition, TeamPlayer } from "@/types/Lineup"
import { useEffect, useState } from "react"
import getConfig from "next/config";
import { countryCodeToFlagEmoji } from "@/types/Team";

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
  const [lineupContentLoaded, setLineupContentLoaded] = useState<boolean>(false);
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
        setLineupContentLoaded(true);
      });
  }, [props.matchId])

  return (
    <>

      <div className="mt-6 flex flex-row bg-c1 items-center justify-center">
        <div className="mt-2 basis-full">
          <div className="bg-c2 shadow-sm shadow-black mb-2">
            <div className="p-3 pl-10">
              <span className="font-extrabold text-c4">Lineups</span>
            </div>
          </div>
        </div>
      </div>
      {lineupContentLoaded ?
        <LineupContent lineup={lineup} />
        :
        <LineupContentSkeleton />
      }
    </>
  )
}

function LineupContent(props: { lineup: Lineup }) {
  return (
    <>
      <NamedLineup
        title="Starting Players"
        players={zipPlayers(props.lineup.home.startingPlayers, props.lineup.away.startingPlayers)} />
      <NamedLineup
        title="Substitute Players"
        players={zipPlayers(props.lineup.home.substitutePlayers, props.lineup.away.substitutePlayers)} />
    </>
  )
}

function LineupContentSkeleton() {
  return (
    <>
      {["Starting Players", "Substitute Players"].map((title, i) => {
        return (
          <>
            <div
              key={i}
              className="animate-pulse flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2">
              <span className="pl-10 float-left text-sm text-c3">{title}</span>
            </div>
            <div className="flex flex-row">
              <table className="basis-full table-auto mx-8 mb-10">
                <tbody>
                  {[...Array(8)].map((_e, j) => {
                    return (
                      <div
                        key={j}
                        className="animate-pulse odd:bg-c1 even:bg-c0">
                        <div className="h-6"></div>
                      </div>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      })}
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
      <div className="flex flex-row bg-c1 h-8 pt-2 shadow-sm shadow-black mb-2">
        <div className="">
          <span className="pl-10 float-left text-sm text-c3">{props.title}</span>
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
              <tr className="odd:bg-c1 even:bg-c0">
                <td className="font-mono font-extrabold">{e.homePlayer?.number}</td>
                <td>{countryCodeToFlagEmoji(e.homePlayer?.countryCode)}</td>
                <td className="text-xs text-gray">{PlayerPosition.format(e.homePlayer?.position)}</td>
                <td>{e.homePlayer?.player.name}</td>
                <td></td>
                <td className="float-right pr-2">{e.awayPlayer?.player.name}</td>
                <td className="text-xs text-gray">{PlayerPosition.format(e.awayPlayer?.position)}</td>
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
