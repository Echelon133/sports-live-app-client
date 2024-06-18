import Image from 'next/image'

export default function DatePicker() {
  return (
    <>
      <div className="flex flex-row w-full h-14 bg-rose-300 items-center justify-center">
        <div className="basis-1/6">
          <button className="bg-white flex rounded-lg float-right hover:bg-gray-700 hover:bg-opacity-25 hover:text-gray-100">
            <Image width="30" height="30" src="chevron-left.svg" alt="Previous day" />
          </button>
        </div>
        <div className="basis-4/6 pl-3 pr-3">
          <button className="bg-white flex rounded-lg w-full items-center justify-center hover:bg-gray-700 hover:bg-opacity-25 hover:text-gray-100">
            <Image className="float-left" width="30" height="30" src="calendar.svg" alt="Precise date picker" />
            <span className="font-bold mt-1 pl-2">Today</span>
          </button >
        </div>
        <div className="basis-1/6">
          <button className="bg-white flex rounded-lg float-left hover:bg-gray-700 hover:bg-opacity-25 hover:text-gray-100">
            <Image width="30" height="30" src="chevron-right.svg" alt="Next day" />
          </button>
        </div>
      </div>
    </>
  );
}
