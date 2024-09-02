import { Dispatch, SetStateAction, useState } from "react"

export type FilterOptionKey = string;

export type FilterOption = {
  displayName: string,
  isSelected: boolean,
}

export type FilterMenuInfo = {
  options: Map<FilterOptionKey, FilterOption>,
  currentlySelected: string,
  setCurrentlySelected: Dispatch<SetStateAction<string>>,
}

export default function FilterMenu(props: { filter: FilterMenuInfo }) {
  const [options, setOptions] = useState<Map<FilterOptionKey, FilterOption>>(props.filter.options);

  function pickFilterOption(key: string) {
    setOptions((prev) => {
      const updatedMap = new Map(prev);
      updatedMap.forEach((v, k) => {
        if (k === key) {
          v.isSelected = true;
        } else {
          v.isSelected = false;
        }
      });
      return updatedMap;
    });

    props.filter.setCurrentlySelected(key);
  }

  return (
    <>
      <div className="flex basis-full text-black">
        {Array.from(options).map(([key, filterOption]) => {
          return <button
            className={`px-4 py-1 mx-1 ${filterOption.isSelected ? "bg-c4" : "bg-gray hover:bg-c3"} font-mono font-extrabold rounded-xl`}
            onClick={() => pickFilterOption(key)}
            key={key}
          >{filterOption.displayName}</button>
        })}
      </div>
    </>
  )
}
