export default function GroupedMatchInfoSkeleton() {
  return (
    <>
      {[...Array(2)].map((_e, i) => {
        return (
          <div key={i} className="mt-8 h-full flex flex-row bg-rose-200">
            <div className="mt-2 basis-full">
              <div className="animate-pulse bg-rose-300 shadow-sm shadow-black">
                <div className="p-3 pl-10">
                  <span className="ml-2"></span>
                </div>
              </div>
              <div>
                {[...Array(4)].map((_e, j) => {
                  return (
                    <div key={j} className="animate-pulse mb-1 bg-rose-100 h-14 shadow-sm shadow-gray-400">
                    </div>
                  );
                })}
              </div>
            </div>
          </div >
        );
      })}
    </>
  );
}
