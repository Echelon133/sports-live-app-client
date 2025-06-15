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
import LabeledMatchInfo from "@/components/LabeledMatchInfo";
import { CompactMatchInfo, MatchStatus } from "@/types/Match";
import useHideOnUserEvent from "@/components/hooks/useHideOnUserEvent";
import GroupedMatchInfo from "@/components/GroupedMatchInfo";
import RoutingHorizontalMenu, { RoutingMenuConfig, createMenuConfig } from "@/components/RoutingHorizontalMenu";
import { FullTeamInfo } from "@/types/Team";
import ListPicker, { PickerOptionMap, getCurrentlySelectedPickerOption } from "@/components/ListPicker";

const { publicRuntimeConfig } = getConfig();

export default function Competition() {
  const router = useRouter();
  const [globalUpdatesSocket, setGlobalUpdatesSocket] = useState<Socket | undefined>(undefined);
  const [competitionInformation, setCompetitionInformation] =
    useState<CompetitionInfo | undefined>(undefined);
  const [menuConfig, setMenuConfig] = useState<RoutingMenuConfig | undefined>(
    undefined
  );

  // we expect the path to be /competition/[0]/[1]
  // where [0] is competition's id, and [1] is the subpage (i.e. results/fixtures/standings)
  const competitionId = router.query.path?.[0];
  const competitionSubPage = router.query.path?.[1];

  // wait until competition's id is available, so that the base route required by
  // the menu can be constructed
  useEffect(() => {
    if (competitionId === undefined) {
      return;
    }
    setMenuConfig(() => {
      const baseRoute = `/competition/${encodeURIComponent(competitionId)}`;
      const menuOptions = [
        { name: "results", displayedName: "RESULTS", path: `${baseRoute}/results` },
        { name: "fixtures", displayedName: "FIXTURES", path: `${baseRoute}/fixtures` },
        { name: "standings", displayedName: "STANDINGS", path: `${baseRoute}/standings` },
      ];

      const currentlySelectedOption = competitionSubPage?.toLowerCase() ?? "";
      // if currently selected subpage does not exist among possibilities, 
      // redirect to the first option from the menu
      if (!menuOptions.map(o => o.name).includes(currentlySelectedOption)) {
        router.push(menuOptions[0].path);
      }

      return createMenuConfig(currentlySelectedOption, menuOptions);
    })
  }, [router.query.path])

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
    if (competitionId === undefined) {
      return;
    }

    const competitionUrl = `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}`;
    fetch(competitionUrl)
      .then((res) => res.json())
      .then((data) => {
        const d: CompetitionInfo = data;
        setCompetitionInformation(d);
      });
  }, [competitionId]);

  return (
    <div className="flex flex-row items-center justify-center">
      <div className="mt-10 pt-12 basis-full rounded-md border border-c2">
        {competitionInformation !== undefined ?
          <CompetitionInfoContent competition={competitionInformation} />
          :
          <CompetitionInfoContentSkeleton />
        }
        <div className="mt-12 flex flex-row justify-center">
          <div>
            {menuConfig !== undefined &&
              <RoutingHorizontalMenu menuConfig={menuConfig} />
            }
          </div>
        </div>
        <div className="mt-12 pb-8">
          {competitionInformation !== undefined &&
            <>
              {competitionSubPage === "results" &&
                <ResultsSummary key={competitionInformation.id} competition={competitionInformation} />
              }
              {competitionSubPage === "fixtures" &&
                <FixturesSummary
                  key={competitionInformation.id}
                  competition={competitionInformation}
                  globalUpdatesSocket={globalUpdatesSocket}
                />
              }
              {competitionSubPage === "standings" &&
                <StandingsSummary
                  key={competitionInformation.id}
                  competition={competitionInformation}
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
            className="bg-white p-2 h-[150px] w-[150px] rounded-xl float-right"
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
  const router = useRouter();
  const [menuConfig, setMenuConfig] = useState<RoutingMenuConfig | undefined>(
    undefined
  );

  // we expect the path to be /competition/[0]/standings/[2]
  // where [0] is the competition's id, [1] is always set to 'standings', and
  // [2] is the subpage of standings (i.e. league-phase, knockout-phase, top scorers)
  const competitionId = router.query.path?.[0];
  const standingsSubPage = router.query.path?.[2];

  // wait until competition's id is available, so that the base route required by
  // the menu can be constructed
  useEffect(() => {
    if (competitionId === undefined) {
      return;
    }
    setMenuConfig(() => {
      const baseRoute = `/competition/${encodeURIComponent(competitionId)}/standings`;
      let menuOptions = [];
      if (props.competition?.leaguePhase) {
        menuOptions.push({ name: "league-phase", displayedName: "LEAGUE PHASE", path: `${baseRoute}/league-phase` });
      }
      if (props.competition?.knockoutPhase) {
        menuOptions.push({ name: "knockout-phase", displayedName: "KNOCKOUT PHASE", path: `${baseRoute}/knockout-phase` });
      }

      menuOptions.push({ name: "top-scorers", displayedName: "TOP SCORERS", path: `${baseRoute}/top-scorers` });

      const currentlySelectedOption = standingsSubPage?.toLowerCase() ?? "";
      // if currently selected subpage does not exist among possibilities, 
      // redirect to the first option from the menu
      if (!menuOptions.map(o => o.name).includes(currentlySelectedOption)) {
        router.push(menuOptions[0].path);
      }

      return createMenuConfig(currentlySelectedOption, menuOptions);
    })
  }, [router.query.path])

  return (
    <>
      <div className="ml-12 mb-6">
        {menuConfig !== undefined &&
          <RoutingHorizontalMenu menuConfig={menuConfig} />
        }
      </div>
      {standingsSubPage === "league-phase" &&
        <LeaguePhase competition={props.competition} globalUpdatesSocket={props.globalUpdatesSocket} />
      }
      {standingsSubPage === "knockout-phase" &&
        <KnockoutPhase competition={props.competition} />
      }
      {standingsSubPage === "top-scorers" &&
        <TopScorersListing competitionId={props.competition!.id} />
      }
    </>
  )
}

function LeaguePhase(props: {
  competition: CompetitionInfo,
  globalUpdatesSocket: Socket | undefined
}) {
  const router = useRouter();
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [menuConfig, setMenuConfig] = useState<RoutingMenuConfig | undefined>(
    undefined
  );

  // we expect the path to be /competition/[0]/standings/league-phase/[3]
  // where [0] is competition's id, [1] is always 'standings', 
  // [2] is always 'league-phase', and [3] is the subpage of the league phase
  // (i.e. groups, by-round)
  const competitionId = router.query.path?.[0];
  const leaguePhaseSubPage = router.query.path?.[3];

  // wait until competition's id is available, so that the base route required by
  // the menu can be constructed
  useEffect(() => {
    if (competitionId === undefined) {
      return;
    }

    setMenuConfig(() => {
      const baseRoute = `/competition/${encodeURIComponent(competitionId)}/standings/league-phase`;
      const menuOptions = [
        { name: "groups", displayedName: "GROUPS", path: `${baseRoute}/groups` },
        { name: "by-round", displayedName: "BY ROUND", path: `${baseRoute}/by-round` }
      ];

      const currentlySelectedOption = leaguePhaseSubPage?.toLowerCase() ?? "";
      // if currently selected subpage does not exist among possibilities, 
      // redirect to the first option from the menu
      if (!menuOptions.map(o => o.name).includes(currentlySelectedOption)) {
        router.push(menuOptions[0].path);
      }

      return createMenuConfig(currentlySelectedOption, menuOptions);
    })
  }, [router.query.path])

  return (
    <>
      <div className="ml-12 mb-6">
        {menuConfig !== undefined &&
          <RoutingHorizontalMenu menuConfig={menuConfig} />
        }
      </div>
      {leaguePhaseSubPage === "groups" &&
        <CompetitionGroups
          competition={props.competition}
          setCurrentRound={setCurrentRound}
        />
      }
      {leaguePhaseSubPage === "by-round" &&
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
  const [roundPickerOptionMap, setRoundPickerOptionMap] =
    useState<PickerOptionMap>(createPickerOptions);
  const [roundMatches, setRoundMatches] = useState<CompactMatchInfo[]>([]);

  const selectedRound = getCurrentlySelectedPickerOption(roundPickerOptionMap)?.name;

  function createPickerOptions(): PickerOptionMap {
    var roundOptions: PickerOptionMap = new Map();
    const maxRounds = props.competition.maxRounds ?? 1;

    for (let roundIndex = 1; roundIndex <= maxRounds; roundIndex++) {
      const key = roundIndex.toString();
      roundOptions.set(key, {
        name: key,
        displayName: `Round ${roundIndex}`,
        isSelected: roundIndex === props.defaultRound
      })
    }
    return roundOptions;
  }

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
      <ListPicker
        pickerOptionMap={roundPickerOptionMap}
        setPickerOptionMap={setRoundPickerOptionMap}
      />
      <GroupedMatchInfo
        competitionInfo={props.competition}
        matches={roundMatches}
        globalUpdatesSocket={props.globalUpdatesSocket}
      />
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
  const [stagePickerOptionMap, setStagePickerOptionMap] =
    useState<PickerOptionMap>(new Map());
  const [knockoutTree, setKnockoutTree] = useState<KnockoutTree | undefined>(undefined);
  const [knockoutContentLoaded, setKnockoutContentLoaded] = useState<boolean>(false);
  const [highlightedSlotIndexes, setHighlightedSlotIndexes] = useState<number[]>([]);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const stageKeys: string[] =
    knockoutTree === undefined ? [] : knockoutTree.stages.map((stage) => stage.stage);
  const competitionId = props.competition.id;

  const selectedStage = stagePickerOptionMap.size === 0 ?
    "" : getCurrentlySelectedPickerOption(stagePickerOptionMap)?.name;

  // We can only initialize the list of picker options after loading the information
  // about available stages from the backend. Different competitions have
  // different numbers of stages.
  useEffect(() => {
    if (knockoutTree === undefined) {
      return;
    }

    setStagePickerOptionMap(() => {
      var stageOptions: PickerOptionMap = new Map();
      // if knockoutTree is not undefined, then stageKeys is initialized
      stageKeys.forEach((key, index) => {
        stageOptions.set(key, {
          name: key,
          displayName: KnockoutStage.format(key)!,
          isSelected: index === 0
        });
      })
      return stageOptions;
    })
  }, [knockoutTree])

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

  function pickStageWithIndex(index: number) {
    if (index >= 0 && index < stageKeys.length) {
      const stageToSelect = stageKeys[index];
      setStagePickerOptionMap((prev) => {
        const updatedMap = new Map(prev);
        updatedMap.forEach((v, k) => {
          v.isSelected = k === stageToSelect;
        })
        return updatedMap;
      })
    }
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
    pickStageWithIndex(getIndexOfCurrentStage() - 1);
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
    pickStageWithIndex(getIndexOfCurrentStage() + 1);
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
        setKnockoutContentLoaded(true);
      })
  }, []);

  return (
    <>
      {knockoutContentLoaded ?
        <div className="min-h-[500px] bg-c1">
          {stagePickerOptionMap.size !== 0 &&
            <ListPicker
              pickerOptionMap={stagePickerOptionMap}
              setPickerOptionMap={setStagePickerOptionMap}
            />
          }
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
                key={groupingIndex}
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
      <Link href={`/team/${encodeURIComponent(team.id)}`}>
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
          <Link href={`/match/${encodeURIComponent(firstLeg.id)}`}>
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
            <Link href={`/match/${encodeURIComponent(secondLeg!.id)}`}>
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
                        <Link href={`/team/${encodeURIComponent(team.teamId)}`}>
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
}) {
  type PlayerWithPosition = { position: number, playerStats: PlayerStatsEntry };

  const [playerStats, setPlayerStats] = useState<PlayerWithPosition[]>([]);
  const [teamInfoCache, setTeamInfoCache] = useState<Map<string, FullTeamInfo>>(new Map());
  const pageNumber = useRef(0);

  function fetchTopScorersPage(competitionId: string, page: number) {
    const httpParams = new URLSearchParams({
      page: page.toString(),
    });

    const topScorersUrl =
      `${publicRuntimeConfig.COMPETITIONS_BASE_URL}/${competitionId}/player-stats?${httpParams.toString()}`;

    fetch(topScorersUrl)
      .then((res) => res.json())
      .then((data) => {
        const players: PlayerStatsEntry[] = data.content;
        let teamInfoPromises: Promise<FullTeamInfo>[] = [];

        // iterate over teamIds of all fetched top scorers and fetch information
        // about these teams
        players.forEach((player) => {
          // if a particular team's info is already cached, do not fetch it again
          if (!teamInfoCache.has(player.teamId)) {
            const teamInfoUrl = `${publicRuntimeConfig.TEAMS_BASE_URL}/${player.teamId}`;
            const promise: Promise<FullTeamInfo> = fetch(teamInfoUrl)
              .then((res) => res.json());
            teamInfoPromises.push(promise);
          }
        });

        // construct a map between each teamId and its FullTeamInfo
        Promise.all(teamInfoPromises)
          .then((arr) => {
            let m: Map<string, FullTeamInfo> = new Map(teamInfoCache);
            arr.forEach((teamInfo) => {
              m.set(teamInfo.id, teamInfo);
            });
            return m;
          })
          .then((m) => {
            setTeamInfoCache(m);
          })
        return players;
      })
      .then((data) => {
        const players: PlayerStatsEntry[] = data;
        type PrevPlayerStat = { goals: number, assists: number, position: number };

        // iterate over all players and calculate the position of each player,
        // bearing in mind that players are ex aequo if they have the same number
        // of goals and assists
        setPlayerStats((prev) => {
          let prevStat: PrevPlayerStat = { goals: 0, assists: 0, position: 0 };
          const allPlayers: PlayerStatsEntry[] = [
            ...prev.map((i) => i.playerStats),
            ...players
          ];
          let result: PlayerWithPosition[] = [];
          allPlayers.forEach((player) => {
            // check if they are ex aequo
            if ((player.goals !== prevStat.goals) || (player.assists !== prevStat.assists)) {
              prevStat.position += 1;
            }
            prevStat.goals = player.goals;
            prevStat.assists = player.assists;
            result.push({ position: prevStat.position, playerStats: player });
          })
          return result;
        });
      })
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
                    const teamId = stat.playerStats.teamId;
                    const playerStats = stat.playerStats;
                    const cachedTeamInfo = teamInfoCache.get(teamId);
                    const teamName = cachedTeamInfo?.name;
                    return (
                      <tr
                        key={stat.playerStats.playerId}
                        className="odd:bg-c0 even:bg-c1 text-center"
                      >
                        <td className="p-1">{stat.position}</td>
                        <td className="font-extralight text-sm">{playerStats.name}</td>
                        <td className="font-extralight text-sm">
                          <div className="flex justify-center items-center">
                            <Image
                              width="22"
                              height="22"
                              src={cachedTeamInfo?.crestUrl ?? "placeholder-club-logo.svg"}
                              alt={teamName ?? "Team's crest"} />
                            <Link href={`/team/${encodeURIComponent(teamId)}`}>
                              <span className="pl-2 hover:underline">{teamName}</span>
                            </Link>
                          </div>
                        </td>
                        <td>{playerStats.goals}</td>
                        <td>{playerStats.assists}</td>
                        <td>{playerStats.yellowCards}</td>
                        <td className="py-1">{playerStats.redCards}</td>
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
