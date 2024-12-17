import Image from 'next/image';

export default function PinIcon() {
  return (
    <div className="flex items-center justify-center h-6 w-6 bg-black rounded-full border border-white">
      <Image width="20" height="20" src="../pin.svg" title="Pinned" alt="Pinned" />
    </div>
  )
}
