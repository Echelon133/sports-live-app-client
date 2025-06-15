import { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import useHideOnUserEvent from "./hooks/useHideOnUserEvent";

export type PickerOption = {
  name: string,
  displayName: string,
  isSelected: boolean
}

export type PickerOptionMap = Map<string, PickerOption>;

export function getCurrentlySelectedPickerOption(optionsMap: PickerOptionMap): PickerOption {
  const pickerValues = Array.from(optionsMap.values());
  let currentlySelectedOption: PickerOption;
  for (var pickerValue of pickerValues) {
    if (pickerValue.isSelected) {
      currentlySelectedOption = pickerValue;
      break;
    }
  }
  return currentlySelectedOption!;
}

export default function ListPicker(props: {
  pickerOptionMap: PickerOptionMap,
  setPickerOptionMap: Dispatch<SetStateAction<PickerOptionMap>>,
  icon?: string,
  onSelectedOptionChange?: (key: string) => void
}) {
  const [pickerRef, pickerListVisible, setPickerListVisible] = useHideOnUserEvent(false);

  const pickerKeys = Array.from(props.pickerOptionMap.keys());
  const pickerValues = Array.from(props.pickerOptionMap.values());

  function togglePickerListVisibility() {
    setPickerListVisible(prev => !prev);
  }

  function pickOptionByKey(selectedKey: string) {
    props.setPickerOptionMap((prev) => {
      const updatedMap = new Map(prev);
      updatedMap.forEach((v, k) => {
        if (k === selectedKey) {
          v.isSelected = true;
          if (props.onSelectedOptionChange !== undefined) {
            props.onSelectedOptionChange(k);
          }
        } else {
          v.isSelected = false;
        }
      });
      return updatedMap;
    })

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
    if (indexToSelect < props.pickerOptionMap.size) {
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
            {props.icon !== undefined &&
              <Image className="float-left" width="30" height="30" src={props.icon} alt="Picker's icon" />
            }
            <span className="font-bold mt-1 pl-2">
              {getCurrentlySelectedPickerOption(props.pickerOptionMap)?.displayName}
            </span>
          </button>
          <ul className={`${pickerListVisible ? "visible" : "invisible"} absolute mt-1 text-center rounded-lg bg-white`}>
            {Array.from(props.pickerOptionMap).map(([key, pickerOption]) => {
              return <li
                className={`${pickerOption.isSelected ? "bg-c3" : ""} w-[230px] text-black m-1 hover:bg-c4 rounded-lg hover:bg-opacity-25 hover:text-gray-600 hover:cursor-pointer`}
                key={key}
                onClick={() => pickOptionByKey(key)}> {pickerOption.displayName}
              </li>
            })}
          </ul>
        </div>
        <button onClick={pickNextOption} className="bg-white h-8 w-8 text-2xl text-black rounded-lg hover:bg-c1 hover:text-white">&gt;</button>
      </div>
    </>
  );
}
