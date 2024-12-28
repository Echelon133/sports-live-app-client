import HorizontalMenu, { MenuConfig, createMenuConfig } from "@/components/HorizontalMenu";
import { useState } from "react";
import Image from 'next/image'
import { FullTeamInfo } from "@/types/Team";
import { CompetitionInfo } from "@/types/Competition";
import getConfig from "next/config";
import Link from "next/link";
import useSearchWithDebounce from "./hooks/useSearchWithDebounce";
import useHideOnUserEvent from "./hooks/useHideOnUserEvent";

const { publicRuntimeConfig } = getConfig();

// wait this many milliseconds after user's last character to
// actually send search request to the server
const SEARCH_DEBOUNCE_TIMEOUT = 250;

export default function SearchBar() {
  const [menuConfig, setMenuConfig] = useState<MenuConfig>(
    createMenuConfig(["TEAMS", "COMPETITIONS"])
  );
  const [searchBarRef, showSearchMenu, setShowSearchMenu] = useHideOnUserEvent(false);
  const [searchInput, setSearchInput] = useState<string>("");

  function handleOnChange(e: React.FormEvent<HTMLInputElement>) {
    setSearchInput(e.currentTarget.value)
  }

  return (
    <>
      <div className="flex justify-end">
        { /* put the ref here, because both horizontal menu and search results are considered part of the search bar 
          and clicking on them should NOT hide the search box */ }
        <div ref={searchBarRef} className="basis-[300px] mt-7">
          <input
            className="text-black pl-6 w-full rounded-sm form-input focus:border-indigo-600"
            onFocus={() => setShowSearchMenu(true)}
            onChange={handleOnChange}
            value={searchInput}
            type="text"
            placeholder="Search"
          />
          <div className={`${showSearchMenu ? "visible" : "invisible"} relative w-full bg-c1 z-50 rounded-b-md border border-b-c0 border-x-c0`}>
            <div className="mt-5 justify-items-center h-14">
              <HorizontalMenu menuConfig={menuConfig} setMenuConfig={setMenuConfig} />
            </div>
            <div className="pb-2">
              {menuConfig.currentlySelected === "TEAMS" &&
                <TeamSearchResults searchQuery={searchInput} />
              }
              {menuConfig.currentlySelected === "COMPETITIONS" &&
                <CompetitionSearchResults searchQuery={searchInput} />
              }
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function TeamSearchResults(props: { searchQuery: string }) {
  const teamResults = useSearchWithDebounce<FullTeamInfo>(
    props.searchQuery, publicRuntimeConfig.TEAMS_BASE_URL, SEARCH_DEBOUNCE_TIMEOUT
  );

  return (
    <>
      {teamResults.length !== 0 &&
        <div>
          {teamResults.map(t => <TeamSearchResultEntry key={t.id} info={t} />)}
        </div>
      }
    </>
  )
}

function TeamSearchResultEntry(props: { info: FullTeamInfo }) {
  return (
    <>
      <Link href={`/team/${props.info.id}`}>
        <div className="flex py-1 items-center justify-evenly hover:bg-c0 hover:cursor-pointer">
          <div className="basis-1/4">
            <Image
              className="bg-white p-1 w-12 h-12 rounded-xl float-right"
              width="100"
              height="100"
              src={`${props.info.crestUrl ?? "../../placeholder-club-logo.svg"}`}
              priority={true}
              alt="Team's name" />
          </div>
          <div className="basis-2/4">
            <p className="font-extrabold text-md">{props.info.name}</p>
          </div>
        </div>
      </Link>
    </>
  )
}

function CompetitionSearchResults(props: { searchQuery: string }) {
  const competitionResults = useSearchWithDebounce<CompetitionInfo>(
    props.searchQuery, publicRuntimeConfig.COMPETITIONS_BASE_URL, SEARCH_DEBOUNCE_TIMEOUT
  );

  return (
    <>
      {competitionResults.length !== 0 &&
        <div>
          {competitionResults.map(t => <CompetitionSearchResultEntry key={t.id} info={t} />)}
        </div>
      }
    </>
  )
}

function CompetitionSearchResultEntry(props: { info: CompetitionInfo }) {
  return (
    <>
      <Link href={`/competition/${props.info.id}`}>
        <div key={props.info.id} className="flex py-1 items-center justify-evenly hover:bg-c0 hover:cursor-pointer">
          <div className="basis-1/4">
            <Image
              className="bg-white p-1 w-12 h-12 rounded-xl float-right"
              width="0"
              height="0"
              src={`${props.info.logoUrl ?? "../../placeholder-competition-logo.svg"}`}
              priority={true}
              alt="Competition's name" />
          </div>
          <div className="basis-2/4">
            <p className="font-extrabold text-md">{props.info.name}</p>
          </div>
        </div>
      </Link>
    </>
  )
}
