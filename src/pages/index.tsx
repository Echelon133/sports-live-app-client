import DatePicker from "@/components/DatePicker";
import { INITIAL_DATE_PICKER_KEY } from "@/components/DatePicker";
import { useState } from "react";

export default function Home() {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(INITIAL_DATE_PICKER_KEY);

  return (
    <main>
      <DatePicker selectedDateKey={selectedDateKey} setSelectedDateKey={setSelectedDateKey} />
    </main>
  );
}
