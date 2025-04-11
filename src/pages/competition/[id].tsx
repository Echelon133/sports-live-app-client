import { useRouter } from "next/router"
import Image from 'next/image'
import getConfig from "next/config";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { CompetitionInfo, CompetitionGroupEntry, CompetitionStandings, LegendEntry, LegendSentiment, PlayerStatsEntry, TeamFormEntries, TeamFormEntry, TeamStanding, LabeledMatches, KnockoutTree, KnockoutStage, KnockoutStageSlot, ByeSlot, TakenSlot } from "@/types/Competition";
import Link from "next/link";
import { FormEntriesBox } from "@/components/FormEntriesBox";
import LoadMoreButton from "@/components/LoadMoreButton";
import { Socket, io } from "socket.io-client";
import InfoMessage from "@/components/InfoMessage";
import HorizontalMenu, { MenuConfig, createMenuConfig } from "@/components/HorizontalMenu";
import LabeledMatchInfo from "@/components/LabeledMatchInfo";
import { CompactMatchInfo, MatchStatus } from "@/types/Match";
import useHideOnUserEvent from "@/components/hooks/useHideOnUserEvent";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";
import { PickerOption } from "@/components/DatePicker";

const { publicRuntimeConfig } = getConfig();

export default function Competition() {
  const router = useRouter();

  const [globalUpdatesSocket, setGlobalUpdatesSocket] = useState<Socket | undefined>(undefined);

  const [competitionInfoContentLoaded, setCompetitionInfoContentLoaded] = useState<boolean>(false);
  const [competitionInformation, setCompetitionInformation] =
    useState<CompetitionInfo | undefined>(undefined);

  const [menuConfig, setMenuConfig] = useState<MenuConfig>(
    createMenuConfig(["RESULTS", "FIXTURES", "STANDINGS"])
  );

  // connect to a websocket which broadcasts global match events
  useEffect(() => {
    const connectionUrl = `${publicRuntimeConfig.GLOBAL_MATCH_EVENTS_WS_URL}`;
    // only connectionUrl is required, since these events are global, and not match specific
    const socket = io(connectionUrl);
    setGlobalUpdatesSocket(socket);

    return () => {
      socket.disconnect();
    }
  }, []);

  useEffect(() => {
    if (router.query.id === undefined) {
      return;
    }

    const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${router.query.id}`;
    fetch(competitionUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: CompetitionInfo = data;
        setCompetitionInformation(d);
        setCompetitionInfoContentLoaded(true);
      });

  }, [router.query.id]);

  return (
    <div className="flex flex-row items-center justify-center">
      <div className="mt-10 pt-12 basis-full rounded-md border border-c2">
        {competitionInfoContentLoaded ?
          <CompetitionInfoContent competition={competitionInformation} />
          :
          <CompetitionInfoContentSkeleton />
        }
        <div className="mt-12 flex flex-row justify-center">
          <div>
            <HorizontalMenu menuConfig={menuConfig} setMenuConfig={setMenuConfig} />
          </div>
        </div>
        <div className="mt-12 pb-8">
          {competitionInfoContentLoaded &&
            <>
              {menuConfig.currentlySelected === "RESULTS" &&
                <ResultsSummary key={competitionInformation?.id} competition={competitionInformation} />
              }
              {menuConfig.currentlySelected === "FIXTURES" &&
                <FixturesSummary
                  key={competitionInformation?.id}
                  competition={competitionInformation}
                  globalUpdatesSocket={globalUpdatesSocket}
                />
              }
              {menuConfig.currentlySelected === "STANDINGS" &&
                <StandingsSummary
                  key={competitionInformation?.id}
                  competition={competitionInformation!}
                  globalUpdatesSocket={globalUpdatesSocket}
                />
              }
            </>
          }
        </div>
      </div>
    </div>
  )
}

function CompetitionInfoContent(props: { competition: CompetitionInfo | undefined }) {
  const competitionLogoUrl = props.competition?.logoUrl;

  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/3">
          <Image
            className="bg-white p-2 rounded-xl float-right"
            width="120"
            height="120"
            src={competitionLogoUrl ?? "../../placeholder-competition-logo.svg"}
            priority={true}
            alt="Competition's name" />
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <p className="font-extrabold text-4xl text-c4">{props.competition?.name}</p>
          <span className="font-extralight text-xl text-c3">{props.competition?.season}</span>
        </div>
      </div>
    </>
  )
}

function CompetitionInfoContentSkeleton() {
  return (
    <>
      <div className="flex flex-row">
        <div className="basis-1/3">
          <Image
            className="bg-white p-2 rounded-xl float-right animate-pulse"
            width="120"
            height="120"
            src="../../placeholder-competition-logo.svg"
            priority={false}
            alt="Competition's name" />
        </div>
        <div className="basis-2/3 mt-6 pl-16">
          <div className="animate-pulse bg-c4 h-12 w-full"></div>
          <div className="animate-pulse bg-c3 mt-2 h-6 w-full"></div>
        </div>
      </div>
    </>
  )
}

function ResultsSummary(props: { competition: CompetitionInfo | undefined }) {
  const [resultsContentLoaded, setResultsContentLoaded] = useState<boolean>(false);
  const [matches, setMatches] = useState<LabeledMatches>(new Map());
  const pageNumber = useRef<number>(0);

  function fetchResultsPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      finished: "true",
      page: page.toString(),
      size: "10",
    });

    const finishedMatchesUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/matches?${httpParams.toString()}`;
    fetch(finishedMatchesUrl)
      .then((res) => res.text())
      .then((data) => {
        // rebuild request's body into our custom type
        const d: LabeledMatches = LabeledMatches.fromJSON(data);
        setMatches((prev) => {
          let updatedMap = new Map(prev);
          // we have to merge arrays instead of replacing them
          d.forEach((value, key) => {
            const prevValue: CompactMatchInfo[] = updatedMap.get(key) ?? [];
            const updatedValue = [...prevValue, ...value];
            updatedMap.set(key, updatedValue);
          });
          return updatedMap;
        });
        setResultsContentLoaded(true);
      });
  }

  function fetchMoreResults(competitionId: string) {
    pageNumber.current += 1;
    fetchResultsPage(competitionId, pageNumber.current)
  }

  useEffect(() => {
    if (props.competition === undefined) {
      return;
    }

    const competitionId = props.competition.id;
    fetchResultsPage(competitionId, pageNumber.current)
  }, [props.competition])

  return (
    <>
      {resultsContentLoaded && (props.competition !== undefined) ?
        <>
          {Array.from(matches).map(([label, matches]) => {
            return <LabeledMatchInfo
              key={label}
              label={label}
              matches={matches}
              globalUpdatesSocket={undefined}
            />
          })}
          {matches.size !== 0 ?
            <div className="flex">
              <LoadMoreButton onClick={() => fetchMoreResults(props.competition!.id)} />
            </div>
            :
            <div className="mt-8">
              <InfoMessage message="No results" />
            </div >
          }
        </>
        :
        <SummarySkeleton />
      }
    </>
  )
}

function FixturesSummary(props: {
  competition: CompetitionInfo | undefined,
  globalUpdatesSocket: Socket | undefined
}) {
  const [fixturesContentLoaded, setFixturesContentLoaded] = useState<boolean>(false);
  const [matches, setMatches] = useState<LabeledMatches>(new Map());
  const pageNumber = useRef<number>(0);

  function fetchFixturesPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      finished: "false",
      page: page.toString(),
      size: "10",
    });

    const nonFinishedMatchesUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/matches?${httpParams.toString()}`;
    fetch(nonFinishedMatchesUrl)
      .then((res) => res.text())
      .then((data) => {
        // rebuild request's body into out custom type
        const d: LabeledMatches = LabeledMatches.fromJSON(data);
        setMatches((prev) => {
          let updatedMap = new Map(prev);
          // we have to merge arrays instead of replacing them
          d.forEach((value, key) => {
            const prevValue: CompactMatchInfo[] = updatedMap.get(key) ?? [];
            const updatedValue = [...prevValue, ...value];
            updatedMap.set(key, updatedValue);
          });
          return updatedMap;
        });
        setFixturesContentLoaded(true);
      });
  }

  function fetchMoreFixtures(competitionId: string) {
    pageNumber.current += 1;
    fetchFixturesPage(competitionId, pageNumber.current);
  }

  useEffect(() => {
    if (props.competition === undefined) {
      return;
    }

    const competitionId = props.competition.id;
    fetchFixturesPage(competitionId, pageNumber.current);
  }, [props.competition]);

  return (
    <>
      {fixturesContentLoaded && (props.competition !== undefined) ?
        <>
          {Array.from(matches).map(([label, matches]) => {
            return <LabeledMatchInfo
              key={label}
              label={label}
              matches={matches}
              globalUpdatesSocket={props.globalUpdatesSocket}
            />
          })}
          {matches.size !== 0 ?
            <div className="flex">
              <LoadMoreButton onClick={() => fetchMoreFixtures(props.competition!.id)} />
            </div>
            :
            <div className="mt-8">
              <InfoMessage message="No results" />
            </div >
          }
        </>
        :
        <SummarySkeleton />
      }
    </>
  )
}

function StandingsSummary(props: {
  competition: CompetitionInfo,
  globalUpdatesSocket: Socket | undefined
}) {
  const [teamInfoCache, setTeamInfoCache] = useState<Map<string, TeamStanding>>(new Map());

  let menuOptions = [];
  if (props.competition?.leaguePhase) {
    menuOptions.push("LEAGUE PHASE");
  }
  if (props.competition?.knockoutPhase) {
    menuOptions.push("KNOCKOUT PHASE");
  }
  const [menuConfig, setMenuConfig] = useState<MenuConfig>(
    createMenuConfig(menuOptions.concat(["TOP SCORERS"]))
  );


  return (
    <>
      <div className="ml-12 mb-6">
        <HorizontalMenu menuConfig={menuConfig} setMenuConfig={setMenuConfig} />
      </div>
      {menuConfig.currentlySelected === "LEAGUE PHASE" &&
        <LeaguePhase
          competition={props.competition}
          setTeamInfoCache={setTeamInfoCache}
          globalUpdatesSocket={props.globalUpdatesSocket}
        />
      }
      {menuConfig.currentlySelected === "KNOCKOUT PHASE" &&
        <KnockoutPhase competition={props.competition} />
      }
      {menuConfig.currentlySelected === "TOP SCORERS" &&
        <TopScorersListing competitionId={props.competition!.id} teamInfoCache={teamInfoCache} />
      }
    </>
  )
}

function LeaguePhase(props: {
  competition: CompetitionInfo,
  setTeamInfoCache: Dispatch<SetStateAction<Map<string, TeamStanding>>>,
  globalUpdatesSocket: Socket | undefined
}) {
  const [currentRound, setCurrentRound] = useState<number>(1);

  const menuOptions = ["GROUPS", "BY ROUND"];
  const [menuConfig, setMenuConfig] = useState<MenuConfig>(
    createMenuConfig(menuOptions)
  );


  return (
    <>
      <div className="ml-12 mb-6">
        <HorizontalMenu menuConfig={menuConfig} setMenuConfig={setMenuConfig} />
      </div>
      {menuConfig.currentlySelected === "GROUPS" &&
        <CompetitionGroups
          competition={props.competition}
          setTeamInfoCache={props.setTeamInfoCache}
          setCurrentRound={setCurrentRound}
        />
      }
      {menuConfig.currentlySelected === "BY ROUND" &&
        <MatchesByRound
          competition={props.competition}
          defaultRound={currentRound}
          globalUpdatesSocket={props.globalUpdatesSocket}
        />
      }
    </>
  )
}

function CompetitionGroups(props: {
  competition: CompetitionInfo | undefined,
  setTeamInfoCache: Dispatch<SetStateAction<Map<string, TeamStanding>>>,
  setCurrentRound: Dispatch<SetStateAction<number>>
}) {
  const [standingsContentLoaded, setStandingsContentLoaded] = useState<boolean>(false);
  const [competitionStandings, setCompetitionStandings] =
    useState<CompetitionStandings | undefined>(undefined);

  useEffect(() => {
    if (props.competition === undefined) {
      return;
    }

    const competitionId = props.competition.id;
    const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/standings`;
    fetch(competitionUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: CompetitionStandings = data;

        // create a mapping between teamIds and team names/crests to 
        // potentially reuse that information in the TOP SCORERS
        // tab
        const teamCache: Map<string, TeamStanding> = new Map();
        for (let group of d.groups) {
          for (let team of group.teams) {
            teamCache.set(team.teamId, team);
          }
        }

        // iterate over the 'Matches Played' column and find the max number, so
        // that we know how many rounds of the competition have been played
        // at this point, since we want to display the round that's currently 
        // being played as the default round in the view which shows matches 
        // filtered by round
        let currentRound = 0;
        for (let group of d.groups) {
          for (let team of group.teams) {
            currentRound = Math.max(currentRound, team.matchesPlayed);
          }
        }
        props.setCurrentRound(currentRound);

        props.setTeamInfoCache(teamCache);
        setCompetitionStandings(d);
        setStandingsContentLoaded(true);
      });

  }, [props.competition]);

  return (
    <>
      {standingsContentLoaded ?
        <>
          <div className="">
            {competitionStandings?.groups.map((group) =>
              <CompetitionGroupBox
                key={group.name}
                competitionId={props.competition!.id}
                group={group}
                legendEntries={competitionStandings.legend}
              />
            )}
          </div>
          <div className="">
            {competitionStandings?.legend.map((legend, i) => <LegendExplanationBox key={i} legend={legend} />)}
          </div>
        </>
        :
        <SummarySkeleton />
      }
    </>
  )
}

function MatchesByRound(props: {
  competition: CompetitionInfo,
  defaultRound: number,
  globalUpdatesSocket?: Socket | undefined
}) {
  const [selectedRound, setSelectedRound] =
    useState<number>(props.defaultRound === 0 ? 1 : props.defaultRound);
  const [roundMatches, setRoundMatches] = useState<CompactMatchInfo[]>([]);

  useEffect(() => {
    if (props.competition?.id === undefined) {
      return;
    }

    const competitionId = props.competition.id!;

    const roundMatchesUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/league/rounds/${selectedRound}`;
    fetch(roundMatchesUrl)
      .then((res) => res.text())
      .then((data) => {
        const d: CompactMatchInfo[] = CompactMatchInfo.fromJSON(data);
        setRoundMatches(d);
      })
  }, [selectedRound])

  return (
    <>
      <RoundPicker
        selectedRound={selectedRound}
        setSelectedRound={setSelectedRound}
        maxRounds={props.competition?.maxRounds ?? 1}
      />
      <GroupedMatchInfo
        competitionInfo={props.competition}
        matches={roundMatches}
        globalUpdatesSocket={props.globalUpdatesSocket}
      />
    </>
  )
}

function RoundPicker(props: {
  selectedRound: number,
  setSelectedRound: Dispatch<SetStateAction<number>>,
  maxRounds: number
}) {
  const [pickerRef, pickerListVisible, setPickerListVisible] = useHideOnUserEvent(false);
  const [pickerOptions, setPickerOptions] = useState<Map<number, PickerOption>>(createPickerOptions());

  const pickerKeys = Array.from(pickerOptions.keys());
  const pickerValues = Array.from(pickerOptions.values());

  function createPickerOptions(): Map<number, PickerOption> {
    let map: Map<number, PickerOption> = new Map();
    for (let round = 1; round <= props.maxRounds; round++) {
      const pOption: PickerOption =
        { displayName: `Round ${round}`, isSelected: round === props.selectedRound };
      map.set(round, pOption);
    }
    return map;
  }

  function togglePickerListVisibility() {
    setPickerListVisible(prev => !prev);
  }

  function pickOptionByKey(selectedKey: number) {
    setPickerOptions((prev) => {
      const updatedMap = new Map(prev);
      updatedMap.forEach((v, k) => {
        if (k === selectedKey) {
          v.isSelected = true;
        } else {
          v.isSelected = false;
        }
      });
      return updatedMap;
    });
    props.setSelectedRound(selectedKey);
    setPickerListVisible(false);
  }

  function pickOptionByIndex(index: number) {
    const keyToSelect = pickerKeys[index];
    pickOptionByKey(keyToSelect)
  }

  function findIndexOfCurrentOption(): number {
    for (let i = 0; i < pickerValues.length; i++) {
      if (pickerValues[i].isSelected) {
        return i;
      }
    }
    return -1;
  }

  function pickNextOption() {
    const indexToSelect = findIndexOfCurrentOption() + 1;
    if (indexToSelect < pickerOptions.size) {
      pickOptionByIndex(indexToSelect)
    }
  }

  function pickPreviousOption() {
    const indexToSelect = findIndexOfCurrentOption() - 1;
    if (indexToSelect >= 0) {
      pickOptionByIndex(indexToSelect);
    }
  }

  return (
    <>
      <div className="flex flex-row h-12 bg-c2 items-center justify-center">
        <button onClick={pickPreviousOption} className="bg-white h-8 w-8 text-2xl text-black rounded-lg hover:bg-c1 hover:text-white">&lt;</button>
        <div ref={pickerRef} className="basis-[240px] mx-1">
          <button onClick={togglePickerListVisibility} className="bg-white text-black flex rounded-lg w-full items-center justify-center hover:bg-c1 hover:text-white">
            <span className="font-bold mt-1 pl-2">
              {pickerOptions.get(props.selectedRound!)?.displayName}
            </span>
          </button>
          <ul className={`${pickerListVisible ? "visible" : "invisible"} absolute mt-1 text-center rounded-lg bg-white`}>
            {Array.from(pickerOptions).map(([key, pickerOption]) => {
              return <li
                className={`${pickerOption.isSelected ? "bg-c3" : ""} w-[240px] text-black m-1 hover:bg-c4 rounded-lg hover:bg-opacity-25 hover:text-gray-600 hover:cursor-pointer`}
                key={key}
                onClick={() => pickOptionByKey(key)}> {pickerOption.displayName}
              </li>
            })}
          </ul>
        </div>
        <button onClick={pickNextOption} className="bg-white h-8 w-8 text-2xl text-black rounded-lg hover:bg-c1 hover:text-white">&gt;</button>
      </div>
    </>
  )
}

// props needed to display prev/next buttons next to knockout slots, 
// to enable quick navigation between the stages (with highlighting
// of the slot/slots which are related to each other)
type SelectedStageProps = {
  isFirst: boolean,
  isLast: boolean,
  prevStageWithHighlight: (currentSlotIndex: number) => void,
  nextStageWithHighlight: (currentSlotIndex: number) => void,
  highlightedSlotIndexes: number[]
}

function KnockoutPhase(props: { competition: CompetitionInfo }) {
  const [knockoutTree, setKnockoutTree] = useState<KnockoutTree | undefined>(undefined);
  const [knockoutContentLoaded, setKnockoutContentLoaded] = useState<boolean>(false);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [highlightedSlotIndexes, setHighlightedSlotIndexes] = useState<number[]>([]);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const stageKeys: string[] =
    knockoutTree === undefined ? [] : knockoutTree.stages.map((stage) => stage.stage);
  const competitionId = props.competition.id;

  function getSlotsOfStage(stage: string): KnockoutStageSlot[] {
    for (let stageEntry of knockoutTree!.stages) {
      if (stageEntry.stage === stage) {
        return stageEntry.slots;
      }
    }
    return [];
  }

  function getIndexOfCurrentStage(): number {
    return stageKeys.indexOf(selectedStage);
  }

  function prevStageWithHighlight(currentSlotIndex: number) {
    // i.e. going from slot2 to the previous stage should highlight both slot0
    //      and slot1
    //
    //   S0       S1
    // -------|--------
    // slot0 \
    //          slot2
    // slot1 /
    setHighlightedSlotIndexes([currentSlotIndex * 2, currentSlotIndex * 2 + 1]);
    resetHighlightedSlotIndexes();
    setSelectedStage(stageKeys[getIndexOfCurrentStage() - 1]);
  }

  function nextStageWithHighlight(currentSlotIndex: number) {
    // i.e. going from slot0 and slot1 to the next stage should only highlight
    //      slot2
    //
    //   S0       S1
    // -------|--------
    // slot0 \
    //          slot2
    // slot1 /
    setHighlightedSlotIndexes([currentSlotIndex / 2]);
    resetHighlightedSlotIndexes();
    setSelectedStage(stageKeys[getIndexOfCurrentStage() + 1]);
  }

  function resetHighlightedSlotIndexes() {
    // if a highlight timeout already exists, clear it and replace it with
    // a new one, because only the latest timeout should be active
    if (highlightTimeoutRef.current !== undefined) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = undefined;
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedSlotIndexes([])
    }, 5000);
  }

  // this is used for conditional rendering of previous/next buttons which let
  // users highlight the previous/next match which is related to a particular
  // slot grouping (i.e. pressing the "previous" button of the final match
  // will switch the current stage to the previous (semi-final) stage, and
  // highlight both semifinals, since these semi-finals decide who is going
  // to play in the final)
  const selectedStageProps: SelectedStageProps = {
    isFirst: stageKeys.indexOf(selectedStage) === 0,
    isLast: stageKeys.indexOf(selectedStage) === stageKeys.length - 1,
    prevStageWithHighlight: prevStageWithHighlight,
    nextStageWithHighlight: nextStageWithHighlight,
    highlightedSlotIndexes: highlightedSlotIndexes
  }

  useEffect(() => {
    const treeUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/knockout`;
    fetch(treeUrl)
      .then((res) => res.text())
      .then((data) => {
        const d: KnockoutTree = KnockoutTree.fromJSON(data);
        setKnockoutTree(d);
        setSelectedStage(d.stages[0].stage);
        setKnockoutContentLoaded(true);
      })
  }, []);

  return (
    <>
      {knockoutContentLoaded ?
        <div className="min-h-[500px] bg-c1">
          <KnockoutStagePicker
            stageKeys={stageKeys}
            selectedStage={selectedStage}
            setSelectedStage={setSelectedStage}
          />
          <KnockoutStageSlotGrouping
            selectedStageProps={selectedStageProps}
            slots={getSlotsOfStage(selectedStage)}
          />
        </div>
        :
        <>
        </>
      }
    </>
  );
}

function KnockoutStagePicker(props: {
  stageKeys: string[],
  selectedStage: string,
  setSelectedStage: Dispatch<SetStateAction<string>>
}) {
  const [pickerRef, pickerListVisible, setPickerListVisible] = useHideOnUserEvent(false);
  const [pickerOptions, setPickerOptions] =
    useState<Map<string, PickerOption>>(createPickerOptions());

  const pickerKeys = Array.from(pickerOptions.keys());
  const pickerValues = Array.from(pickerOptions.values());

  function createPickerOptions(): Map<string, PickerOption> {
    let map: Map<string, PickerOption> = new Map();
    props.stageKeys.forEach((key, index) => {
      let isSelected = false;
      if (index === 0) {
        isSelected = true;
      }
      const pOption: PickerOption =
        { displayName: KnockoutStage.format(key)!, isSelected: isSelected };
      map.set(key, pOption);
    })
    return map;
  }

  function togglePickerListVisibility() {
    setPickerListVisible(prev => !prev);
  }

  function pickOptionByKey(selectedKey: string) {
    setPickerOptions((prev) => {
      const updatedMap = new Map(prev);
      updatedMap.forEach((v, k) => {
        if (k === selectedKey) {
          v.isSelected = true;
        } else {
          v.isSelected = false;
        }
      });
      return updatedMap;
    });
    props.setSelectedStage(selectedKey);
    setPickerListVisible(false);
  }

  function pickOptionByIndex(index: number) {
    const keyToSelect = pickerKeys[index];
    pickOptionByKey(keyToSelect)
  }

  function findIndexOfCurrentOption(): number {
    for (let i = 0; i < pickerValues.length; i++) {
      if (pickerValues[i].isSelected) {
        return i;
      }
    }
    return -1;
  }

  function pickNextOption() {
    const indexToSelect = findIndexOfCurrentOption() + 1;
    if (indexToSelect < pickerOptions.size) {
      pickOptionByIndex(indexToSelect)
    }
  }

  function pickPreviousOption() {
    const indexToSelect = findIndexOfCurrentOption() - 1;
    if (indexToSelect >= 0) {
      pickOptionByIndex(indexToSelect);
    }
  }

  return (
    <>
      <div className="flex flex-row h-12 bg-c2 items-center justify-center">
        <button onClick={pickPreviousOption} className="bg-white h-8 w-8 text-2xl text-black rounded-lg hover:bg-c1 hover:text-white">&lt;</button>
        <div ref={pickerRef} className="basis-[240px] mx-1">
          <button onClick={togglePickerListVisibility} className="bg-white text-black flex rounded-lg w-full items-center justify-center hover:bg-c1 hover:text-white">
            <span className="font-bold mt-1 pl-2">
              {pickerOptions.get(props.selectedStage!)?.displayName}
            </span>
          </button>
          <ul className={`${pickerListVisible ? "visible" : "invisible"} absolute mt-1 text-center rounded-lg bg-white`}>
            {Array.from(pickerOptions).map(([key, pickerOption]) => {
              return <li
                className={`${pickerOption.isSelected ? "bg-c3" : ""} w-[240px] text-black m-1 hover:bg-c4 rounded-lg hover:bg-opacity-25 hover:text-gray-600 hover:cursor-pointer`}
                key={key}
                onClick={() => pickOptionByKey(key)}> {pickerOption.displayName}
              </li>
            })}
          </ul>
        </div>
        <button onClick={pickNextOption} className="bg-white h-8 w-8 text-2xl text-black rounded-lg hover:bg-c1 hover:text-white">&gt;</button>
      </div>
    </>
  )
}

function KnockoutStageSlotGrouping(props: {
  selectedStageProps: SelectedStageProps,
  slots: KnockoutStageSlot[]
}) {
  // the backend guarantees all stages (apart from the final stage) must have
  // a number of slots that's divisible by 2
  // we need to group slots that are next to each other, because two slots
  // from one stage converge into a single slot in the next stage, etc.
  const groupings: KnockoutStageSlot[][] = [];

  // we are dealing with the final stage, which only has a single slot
  if (props.slots.length === 1) {
    groupings.push([props.slots[0]]);
  } else {
    // we are dealing with any other stage, where the backend guarantees an 
    // even number of slots
    for (let i = 0; i < props.slots.length; i += 2) {
      groupings.push([props.slots[i], props.slots[i + 1]]);
    }
  }

  return (
    <>
      <div className="flex flex-col items-center justify-evenly mt-10 mb-10">
        {groupings.length === 1 ?
          <>
            <KnockoutStageSlotGroupingEntry
              groupingIndex={0}
              selectedStageProps={props.selectedStageProps}
              entrySlots={groupings[0]}
            />
          </>
          :
          <>
            {groupings.map((grouping, groupingIndex) => {
              return <KnockoutStageSlotGroupingEntry
                // multiply groupingIndex by 2, so that internally slots can
                // be numbered sequentially (i.e. grouping 0 has slots 0 and 1,
                // grouping 1 has slots 2 and 3, etc.)
                groupingIndex={groupingIndex * 2}
                selectedStageProps={props.selectedStageProps}
                entrySlots={grouping}
              />
            })}
          </>
        }
      </div>
    </>
  )
}

function KnockoutStageSlotGroupingEntry(props: {
  groupingIndex: number,
  selectedStageProps: SelectedStageProps,
  entrySlots: KnockoutStageSlot[]
}) {
  const firstSlotHighlight =
    props.selectedStageProps.highlightedSlotIndexes.includes(props.groupingIndex);
  const secondSlotHighlight =
    props.selectedStageProps.highlightedSlotIndexes.includes(props.groupingIndex + 1);

  return (
    <>
      <div className="flex flex-col items-center justify-center my-4">
        <div className="flex flex-row">
          <div className="flex flex-col justify-around mr-1">
            <button
              disabled={props.selectedStageProps.isFirst}
              onClick={() => props.selectedStageProps.prevStageWithHighlight(props.groupingIndex)}
              className={`${props.selectedStageProps.isFirst ? "bg-gray-700" : "bg-c0 hover:bg-c4 hover:text-black"} h-8 w-8 text-2xl text-white rounded-lg`}>&lt;
            </button>
            {props.entrySlots.length > 1 &&
              <button
                disabled={props.selectedStageProps.isFirst}
                onClick={() => props.selectedStageProps.prevStageWithHighlight(props.groupingIndex + 1)}
                className={`${props.selectedStageProps.isFirst ? "bg-gray-700" : "bg-c0 hover:bg-c4 hover:text-black"} h-8 w-8 text-2xl text-white rounded-lg`}>&lt;
              </button>
            }
          </div>
          <div className="flex flex-col">
            <KnockoutStageSlotBox
              highlight={firstSlotHighlight}
              slot={props.entrySlots[0]}
            />
            {props.entrySlots.length > 1 &&
              <KnockoutStageSlotBox
                highlight={secondSlotHighlight}
                slot={props.entrySlots[1]}
              />
            }
          </div>
          <div className="flex flex-col justify-around ml-1">
            <button
              disabled={props.selectedStageProps.isLast}
              onClick={() => props.selectedStageProps.nextStageWithHighlight(props.groupingIndex)}
              className={`${props.selectedStageProps.isLast ? "bg-gray-700" : "bg-c0 hover:bg-c4 hover:text-black"} h-8 w-8 text-2xl text-white rounded-lg`}>&gt;
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function KnockoutStageSlotBox(props: {
  highlight: boolean,
  slot: KnockoutStageSlot
}) {
  let slotBox: JSX.Element;
  switch (props.slot.type) {
    case "EMPTY":
      slotBox = <EmptySlotBox />
      break;
    case "BYE":
      slotBox = <ByeSlotBox slot={props.slot} />
      break;
    case "TAKEN":
      slotBox = <TakenSlotBox slot={props.slot} />
      break;
  }
  return (
    <>
      <div className={`my-1 border-4 rounded-lg ${props.highlight ? "border-c4" : "border-c1"} `}>
        {
          slotBox
        }
      </div>
    </>
  );
}

function EmptySlotBox() {
  return (
    <>
      <div className="w-[350px] h-[80px] bg-c2 hover:bg-c0 hover:cursor-pointer rounded-lg">
      </div>
    </>
  )
}

function ByeSlotBox(props: { slot: ByeSlot }) {
  const team = props.slot.team;

  return (
    <>
      <Link href={`/team/${team.id}`}>
        <div className="w-[350px] h-[80px] bg-c2 hover:bg-c0 hover:cursor-pointer rounded-lg">
          <div className="flex flex-col">
            <div className="flex pt-2 pb-1">
              <div className="basis-10/12 pl-5">
                <Image
                  className="float-left"
                  width="20"
                  height="20"
                  src={team.crestUrl ?? "placeholder-club-logo.svg"}
                  alt="Bye team's crest" />
                <span className="font-mono ml-2">{team.name}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </>
  )
}

function TakenSlotBox(props: { slot: TakenSlot }) {
  const [matchListRef, showMatchList, setShowMatchList] = useHideOnUserEvent(false);

  function shortenTeamName(name: string): string {
    return name.split(" ")[0];
  }

  const firstLeg = props.slot.firstLeg;
  const secondLeg = props.slot.secondLeg;

  // whether the slot represents a single legged match or a two-legged one,
  // always display the first leg's ordering of teams 
  const homeCrestUrl = firstLeg.homeTeam?.crestUrl;
  const awayCrestUrl = firstLeg.awayTeam?.crestUrl;

  const firstLegScore = firstLeg.scoreInfo;
  // not every knockout match is two-legged, but since we display the teams
  // in the ordering from the first leg, it's important to remember that the
  // score from the second leg has to be flipped, since the home team from the
  // first game becomes the away team in the second leg
  const secondLegScore = secondLeg?.scoreInfo;

  const showFirstLegScore = firstLeg.status !== MatchStatus.NOT_STARTED;
  const showSecondLegScore = secondLeg?.status !== MatchStatus.NOT_STARTED;

  return (
    <>
      <div
        className="w-[350px] h-[80px] bg-c2 hover:bg-c0 hover:cursor-pointer rounded-lg"
        onClick={() => setShowMatchList(true)}
      >
        <div className="flex flex-col">
          <div className="flex pt-2 pb-1">
            <div className="basis-10/12 pl-5">
              <Image
                className="float-left"
                width="20"
                height="20"
                src={homeCrestUrl ?? "placeholder-club-logo.svg"}
                alt="Home team's crest" />
              <span className="font-mono ml-2"> {firstLeg.homeTeam?.name} </span>
            </div>
            <div className="basis-1/12">
              {showFirstLegScore &&
                <span title="First leg home goals" className="font-extrabold text-c4">
                  {firstLegScore.homeGoals}
                </span>
              }
            </div>
            {secondLegScore !== undefined &&
              <div className="basis-1/12">
                {showSecondLegScore &&
                  <span title="Second leg away goals" className="font-extrabold text-c4">
                    {secondLegScore.awayGoals}
                  </span>
                }
              </div>
            }
          </div>
          <div className="flex pt-2 pb-1">
            <div className="basis-10/12 pl-5">
              <Image
                className="float-left"
                width="20"
                height="20"
                src={awayCrestUrl ?? "placeholder-club-logo.svg"}
                alt="Away team's crest" />
              <span className="font-mono ml-2"> {firstLeg.awayTeam?.name} </span>
            </div>
            <div className="basis-1/12">
              {showFirstLegScore &&
                <span title="First leg away goals" className="font-extrabold text-c4">
                  {firstLegScore.awayGoals}
                </span>
              }
            </div>
            {secondLegScore !== undefined &&
              <div className="basis-1/12">
                {showSecondLegScore &&
                  <span title="Second leg home goals" className="font-extrabold text-c4">
                    {secondLegScore.homeGoals}
                  </span>
                }
              </div>
            }
          </div>
        </div>
        <div ref={matchListRef} className={`flex flex-col absolute bg-c0 w-[350px] rounded-b-lg ${showMatchList ? "visible" : "invisible"}`}>
          <Link href={`/match/${firstLeg.id}`}>
            <div className="basis-full hover:underline">
              <div className="flex flex-row h-10 items-center">
                <div className="basis-2/6 text-center">
                  {formatMatchDate(firstLeg.startTimeUTC)}
                </div>
                <div className="basis-4/6">
                  {shortenTeamName(firstLeg.homeTeam!.name)} - {shortenTeamName(firstLeg.awayTeam!.name)}
                </div>
              </div>
            </div>
          </Link>
          {secondLeg !== undefined &&
            <Link href={`/match/${secondLeg!.id}`}>
              <hr />
              <div className="basis-full hover:underline">
                <div className="flex flex-row h-10 items-center">
                  <div className="basis-2/6 text-center">
                    {formatMatchDate(secondLeg!.startTimeUTC)}
                  </div>
                  <div className="basis-4/6">
                    {shortenTeamName(secondLeg!.homeTeam!.name)} - {shortenTeamName(secondLeg!.awayTeam!.name)}
                  </div>
                </div>
              </div>
            </Link>
          }
        </div>
      </div>
    </>
  )
}



function CompetitionGroupBox(props: {
  competitionId: string,
  group: CompetitionGroupEntry,
  legendEntries: LegendEntry[]
}) {
  // ids of teams whose rows should be highlighted when the client hovers over a form entry
  const [highlightedTeamsIds, setHighlightedTeamsIds] = useState<string[]>([]);

  const sortedTeams: TeamStanding[] = [...props.group.teams];
  sortedTeams.sort((a, b) => {
    const pointDiff: number = a.points - b.points;
    if (pointDiff !== 0) {
      // flip the sign to sort by the points descending
      return -pointDiff;
    } else {
      // points were equal, so sort by comparing the GD
      const aGoalDifference = a.goalsScored - a.goalsConceded;
      const bGoalDifference = b.goalsScored - b.goalsConceded;
      const gdDiff = aGoalDifference - bGoalDifference;
      // flip the sign to sort by the goal difference descending
      return -gdDiff;
    }
  })

  const positionToColor: Map<number, string> =
    LegendSentiment.createPositionToColorMap(props.legendEntries);

  return (
    <>
      <div className="bg-c1 flex flex-row items-center justify-center mb-10">
        <div className="mt-2 basis-full">
          <div className="shadow-sm shadow-black mb-2">
            <div className="p-3 pl-10 bg-c2">
              <span className="font-extrabold text-c4">{props.group.name}</span>
            </div>
          </div>
          <table className="basis-full w-full table-auto">
            <thead>
              <tr className="text-c3 text-center font-extralight text-sm">
                <th>#</th>
                <th>Team</th>
                <th className="pr-4">MP</th>
                <th className="pr-4">W</th>
                <th className="pr-4">D</th>
                <th className="pr-4">L</th>
                <th className="pr-4">G</th>
                <th className="pr-4">GD</th>
                <th className="pr-4">PTS</th>
                <th>FORM</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, i) => {
                const index = i + 1;
                const positionColor = positionToColor.get(index);

                // if highlightedTeamsIds contains this team's id, the user hovered
                // over a form entry of a match in which this team had played,
                // therefore we should highlight this team's entry in the table
                const highlightDependendStyles =
                  highlightedTeamsIds.includes(team.teamId) ?
                    "bg-gray-600" : "odd:bg-c0 even:bg-c1";

                return (
                  <tr key={team.teamId} className={`${highlightDependendStyles} text-center h-10`}>
                    <td><span className={`${positionColor} rounded-lg p-1`}>{index}.</span></td>
                    <td className="font-extralight text-sm">
                      <div className="flex items-center">
                        <Image
                          className="float-left"
                          width="22"
                          height="22"
                          src={team.crestUrl ?? "placeholder-club-logo.svg"}
                          alt={team.teamName ?? "Team's crest"} />
                        <Link href={`/team/${team.teamId}`}>
                          <span className="pl-2 hover:underline">{team.teamName}</span>
                        </Link>
                      </div>
                    </td>
                    <td className="pr-4">{team.matchesPlayed}</td>
                    <td className="pr-4">{team.wins}</td>
                    <td className="pr-4">{team.draws}</td>
                    <td className="pr-4">{team.losses}</td>
                    <td className="pr-4">{team.goalsScored}:{team.goalsConceded}</td>
                    <td className="pr-4">{team.goalsScored - team.goalsConceded}</td>
                    <td className="pr-4">{team.points}</td>
                    <td className="py-1">
                      <FormBox
                        teamId={team.teamId}
                        competitionId={props.competitionId}
                        setHighlightedTeamsIds={setHighlightedTeamsIds}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function LegendExplanationBox(props: { legend: LegendEntry }) {
  const legendColor = LegendSentiment.toColor(props.legend.sentiment);
  return (
    <>
      <div className="flex flex-row items-center ml-7 mb-3">
        <span className={`w-7 h-7 rounded-lg ${legendColor}`}></span>
        <span className="font-extrabold text-sm ml-5">{props.legend.context}</span>
      </div>
    </>
  )
}

function FormBox(props: {
  teamId: string,
  competitionId: string,
  setHighlightedTeamsIds: Dispatch<SetStateAction<string[]>>
}) {
  const [teamForm, setTeamForm] = useState<TeamFormEntry[]>([]);
  const [formContentLoaded, setFormContentLoaded] = useState<boolean>(false);

  useEffect(() => {
    const httpParams = new URLSearchParams({
      competitionId: props.competitionId,
    });
    const formUrl =
      `${publicRuntimeConfig.TEAMS_BASE_URL}/${props.teamId}/form?${httpParams.toString()}`;

    fetch(formUrl)
      .then((res) => res.text())
      .then((data) => {
        const d: TeamFormEntry[] = TeamFormEntries.fromJSON(data);
        setTeamForm(d);
        setFormContentLoaded(true);
      });
  }, [props.teamId, props.competitionId])

  return (
    <>
      {formContentLoaded && (teamForm.length > 0) ?
        <div className="flex justify-center">
          <FormEntriesBox
            formEntries={teamForm}
            setHighlightedTeamsIds={props.setHighlightedTeamsIds}
          />
        </div>
        :
        <span>-</span>
      }
    </>
  )
}

function TopScorersListing(props: {
  competitionId: string,
  teamInfoCache: Map<string, TeamStanding>,
}) {
  const [playerStats, setPlayerStats] = useState<PlayerStatsEntry[]>([]);
  const pageNumber = useRef(0);

  // two players are ex-aequo if their goals and assists are identical, therefore
  // we need to calculate player's position by checking the previous player's stats
  type PlayerGoalsAssists = { goals: number, assists: number, position: number };
  const prevPlayerStat = useRef<PlayerGoalsAssists>({ goals: 0, assists: 0, position: 0 });

  function fetchTopScorersPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      page: page.toString(),
    });

    const topScorersUrl =
      `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/player-stats?${httpParams.toString()}`;

    fetch(topScorersUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: PlayerStatsEntry[] = data.content;
        // clear data which is needed to calculate positions, since
        // updating player stats rerenders the entire table and calculations
        // have to start from 0
        prevPlayerStat.current = { goals: 0, assists: 0, position: 0 };
        setPlayerStats((prev) => [...prev, ...d]);
      });
  }

  function fetchMoreTopScorers(competitionId: string) {
    pageNumber.current += 1;
    fetchTopScorersPage(competitionId, pageNumber.current);
  }

  useEffect(() => {
    fetchTopScorersPage(props.competitionId, pageNumber.current);
  }, [props.competitionId])

  return (
    <>
      {playerStats.length === 0 ?
        <>
          <InfoMessage message="Statistics currently unavailable" />
        </>
        :
        <>
          <div className="flex flex-row bg-c1 items-center justify-center">
            <div className="mt-2 basis-full">
              <div className="bg-c2 shadow-sm shadow-black mb-2">
                <div className="p-3 pl-10">
                  <span className="font-extrabold text-c4">Top Scorers</span>
                </div>
              </div>
              <table className="basis-full w-full table-auto mb-10">
                <thead>
                  <tr className="text-c3 text-center font-extralight text-sm">
                    <th>#</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th className="px-4" title="Goals">G</th>
                    <th className="px-4" title="Assists">A</th>
                    <th className="px-4" title="Yellow Cards">
                      <div className="flex justify-center">
                        <div className="h-4 w-3 bg-yellow-400"></div>
                      </div>
                    </th>
                    <th className="px-4" title="Red Cards">
                      <div className="flex justify-center">
                        <div className="h-4 w-3 bg-red-600"></div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((stat, _i) => {
                    let playerPosition: number = prevPlayerStat.current.position;
                    if (
                      (stat.goals !== prevPlayerStat.current.goals) ||
                      (stat.assists !== prevPlayerStat.current.assists)
                    ) {
                      playerPosition += 1;
                      prevPlayerStat.current.position = playerPosition;
                      prevPlayerStat.current.goals = stat.goals;
                      prevPlayerStat.current.assists = stat.assists;
                    }

                    const cachedTeamInfo = props.teamInfoCache.get(stat.teamId);
                    const teamName = cachedTeamInfo?.teamName;
                    return (
                      <tr
                        key={stat.playerId}
                        className="odd:bg-c0 even:bg-c1 text-center"
                      >
                        <td className="p-1">{playerPosition}</td>
                        <td className="font-extralight text-sm">{stat.name}</td>
                        <td className="font-extralight text-sm">
                          <div className="flex justify-left items-center">
                            <Image
                              width="22"
                              height="22"
                              src={cachedTeamInfo?.crestUrl ?? "placeholder-club-logo.svg"}
                              alt={teamName ?? "Team's crest"} />
                            <Link href={`/team/${cachedTeamInfo?.teamId}`}>
                              <span className="pl-2 hover:underline">{teamName}</span>
                            </Link>
                          </div>
                        </td>
                        <td>{stat.goals}</td>
                        <td>{stat.assists}</td>
                        <td>{stat.yellowCards}</td>
                        <td className="py-1">{stat.redCards}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {playerStats.length !== 0 &&
                <div className="flex">
                  <LoadMoreButton onClick={() => fetchMoreTopScorers(props.competitionId)} />
                </div>
              }
            </div>
          </div>
        </>
      }
    </>
  )
}

function SummarySkeleton() {
  return (
    <>
      <div className="flex flex-row bg-c1">
        <div className="animate-pulse basis-full bg-c2 h-10 shadow-sm shadow-black"></div>
      </div>
      <div className="animate-pulse mb-1 basis-full bg-c1 h-14 shadow-sm shadow-gray-400"></div>
      <div className="animate-pulse mb-1 basis-full bg-c1 h-14 shadow-sm shadow-gray-400"></div>
    </>
  )
}

function formatMatchDate(d: Date): string {
  if (d === undefined) return ""
  const options: Intl.DateTimeFormatOptions = {
    month: "2-digit",
    day: "2-digit",
  }
  return d.toLocaleDateString(undefined, options);
}
