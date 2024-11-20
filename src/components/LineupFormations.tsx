import { Lineup, TeamPlayer } from "@/types/Lineup";

// if any team's formation is null, use this formation to display players' positions
const DEFAULT_FORMATION = "4-4-2";

type PlayerInFormation = {
  name: String,
  number: number,
  home: boolean
}

export default function LineupFormations(props: { lineup: Lineup }) {
  const homeFormation = props.lineup.home?.formation ?? DEFAULT_FORMATION;
  const awayFormation = props.lineup.away?.formation ?? DEFAULT_FORMATION;

  return (
    <>
      <div className="">
        <div className="flex bg-c1 my-3 mx-4 py-2 items-center text-sm text-center font-bold rounded-xl">
          <div className="basis-1/3">
            {homeFormation}
          </div>
          <div className="basis-1/3">
            FORMATION
          </div>
          <div className="basis-1/3">
            {awayFormation}
          </div>
        </div>
        <FootballPitch lineup={props.lineup} />
      </div>
    </>
  );
}

function FootballPitch(props: { lineup: Lineup }) {
  const home = props.lineup.home;
  const away = props.lineup.away;

  const homeFormation = dividePlayersByFormation(home.startingPlayers, home.formation, true);
  const awayFormation = dividePlayersByFormation(away.startingPlayers, away.formation, false);

  return (
    <div className="flex bg-c1 my-2">
      <div className="basis-full football-pitch mx-6 my-4 sm:m-auto">
        <div className="flex flex-col sm:flex-row h-full sm:h-[60vw]">
          <div className="basis-1/2">
            <div className="flex flex-col sm:flex-row h-full justify-evenly">
              {homeFormation.map(row => {
                return (
                  <div className="flex flex-row sm:flex-col-reverse">
                    {row.map(player => {
                      return <PlayerPoint player={player} />
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="basis-1/2">
            <div className="flex flex-col-reverse sm:flex-row-reverse h-full justify-evenly">
              {awayFormation.map(row => {
                return (
                  <div className="flex flex-row-reverse sm:flex-col">
                    {row.map(player => {
                      return <PlayerPoint player={player} />
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerPoint(props: { player: PlayerInFormation }) {
  const sideColor = props.player.home ? "bg-positive-b" : "bg-positive-c";
  return (
    <>
      <div className="flex flex-col items-center m-auto z-50">
        <div className={`${sideColor} w-9 h-9 rounded-full border border-1 border-c4 text-center`}>
          <p className="font-bold text-2xl py-1">{props.player.number}</p>
        </div>
        <div className="absolute">
          <span className="relative top-9 font-bold text-sm px-2 py-1 bg-c0 rounded-xl text-center text-wrap">
            {props.player.name}
          </span>
        </div>
      </div>
    </>
  )
}

function dividePlayersByFormation(
  players: TeamPlayer[],
  formation: String | null,
  home: boolean
): PlayerInFormation[][] {
  // goalkeepers are always first on the list of players, and their position in the formation string is
  // ALWAYS implied, e.g. '4-4-2' is actually '1-4-4-2'
  const goalkeeper = players[0];
  let result: PlayerInFormation[][] = [
    [{ name: extractLastName(goalkeeper), number: goalkeeper.number, home: home }]
  ];

  // if the formation is null, assume it's 4-4-2
  const teamFormation = formation ?? DEFAULT_FORMATION;
  // split the formation string into an array of numbers (i.e. '4-4-2' into [4, 4, 2])
  const rowSizes = teamFormation.split("-").map(v => parseInt(v));

  // start at index 1, since the goalkeeper has already been placed in the first row of the formation
  let currentIndex = 1;

  // skipping the goalkeeper (who is implicitly first), take every single one of remaining 10 players 
  // and place them row by row according to the given formation
  // 
  // e.g. formation '4-2-1-3' has rowSizes = [4, 2, 1, 3] 
  // which results in four additional rows (since the goalkeeper row has already been placed)
  // where the first additonal row contains four players, next additional row contains two players, etc.
  for (let rowSize of rowSizes) {
    let row: PlayerInFormation[] = [];
    const lastPlayerIndex = currentIndex + rowSize;
    while (currentIndex < lastPlayerIndex) {
      const currentPlayer = players[currentIndex];
      row.push({ name: extractLastName(currentPlayer), number: currentPlayer.number, home: home });
      currentIndex++;
    }
    result.push(row);
  }

  return result;
}

function extractLastName(player: TeamPlayer): string {
  const nameSplit = player.player.name.split(" ");
  const splitLength = nameSplit.length;
  if (splitLength >= 3) {
    return nameSplit[splitLength - 2] + ' ' + nameSplit[splitLength - 1];
  } else {
    return nameSplit[splitLength - 1];
  }
}
