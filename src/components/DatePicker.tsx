import Image from 'next/image'
import { useState, Dispatch, SetStateAction } from 'react';

// How many days before today's date should appear in the picker
const DAYS_BEFORE_TODAY: number = 7;
// How many days after today's date should appear in the picker
const DAYS_AFTER_TODAY: number = 7;
const TODAY: Date = new Date();
// Initial key value
export const INITIAL_DATE_PICKER_KEY: string = formatPickerOptionKey(TODAY);


export default function DatePicker(props: {
  selectedDateKey: string,
  setSelectedDateKey: Dispatch<SetStateAction<string>>
}) {
  const [pickerListVisible, setPickerListVisible] = useState<boolean>(false);
  const [pickerOptions, setPickerOptions] = useState<Map<string, PickerOption>>(createPickerOptions);

  // Avoid creating multiple copies of keys/values arrays by reusing arrays created here. 
  // They can be safely used as long as pickerOptions are initialized
  // once and then no more items is added or removed.
  const pickerKeys = Array.from(pickerOptions.keys());
  const pickerValues = Array.from(pickerOptions.values());

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

    props.setSelectedDateKey(selectedKey);
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
      <div className="flex flex-row w-full h-14 bg-rose-300 items-center justify-center">
        <div className="basis-1/6">
          <button onClick={pickPreviousOption} className="bg-white flex rounded-lg float-right hover:bg-gray-700 hover:bg-opacity-25 hover:text-gray-100">
            <Image width="30" height="30" src="chevron-left.svg" alt="Previous day" />
          </button>
        </div>
        <div className="relative basis-4/6">
          <button onClick={togglePickerListVisibility} className="bg-white flex rounded-lg w-full items-center justify-center hover:bg-gray-700 hover:bg-opacity-25 hover:text-gray-100">
            <Image className="float-left" width="30" height="30" src="calendar.svg" alt="Precise date picker" />
            <span className="font-bold mt-1 pl-2">{pickerOptions.get(props.selectedDateKey)!.displayName}</span>
          </button >
          <ul className={`${pickerListVisible ? "visible" : "invisible"} absolute mt-1 w-full text-center rounded-lg bg-white`}>
            {Array.from(pickerOptions).map(([key, pickerOption]) => {
              return <li className={`${pickerOption.isSelected ? "bg-red-200" : ""} m-1 hover:bg-gray-700 rounded-lg hover:bg-opacity-25 hover:text-gray-100 hover:cursor-pointer`} key={key} onClick={() => pickOptionByKey(key)}> {pickerOption.displayName}</li>
            })}
          </ul>
        </div>
        <div className="basis-1/6">
          <button onClick={pickNextOption} className="bg-white flex rounded-lg float-left hover:bg-gray-700 hover:bg-opacity-25 hover:text-gray-100">
            <Image width="30" height="30" src="chevron-right.svg" alt="Next day" />
          </button>
        </div>
      </div >
    </>
  );
}

type PickerOption = {
  displayName: string,
  isSelected: boolean,
}

// Take a date object and return a string with 'yyyy/mm/dd' format
function formatPickerOptionKey(d: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
  return d.toLocaleDateString("zh-Hans-CN", options);
}

// Take a date object and return a string with 'DAY_OF_WEEK, mm/dd' format
function formatPickerOptionValue(d: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "2-digit",
    day: "2-digit",
  }
  return d.toLocaleDateString("gb-En", options);
}

// Create a list of possible date options
function createPickerOptions(): Map<string, PickerOption> {
  var dateOptions: Map<string, PickerOption> = new Map();

  const dayMillis = 24 * 60 * 60 * 1000;

  // calculate options for days before today
  for (let i = DAYS_BEFORE_TODAY; i > 0; i--) {
    const day = new Date(TODAY.getTime() - (i * dayMillis));
    dateOptions.set(
      formatPickerOptionKey(day),
      { displayName: formatPickerOptionValue(day), isSelected: false }
    );
  }

  // calculate one option for today
  dateOptions.set(
    INITIAL_DATE_PICKER_KEY,
    { displayName: "Today", isSelected: true }
  )

  // calculate options for days after today
  for (let i = 1; i <= DAYS_AFTER_TODAY; i++) {
    const day = new Date(TODAY.getTime() + (i * dayMillis));
    dateOptions.set(
      formatPickerOptionKey(day),
      { displayName: formatPickerOptionValue(day), isSelected: false }
    );
  }

  return dateOptions;
}
