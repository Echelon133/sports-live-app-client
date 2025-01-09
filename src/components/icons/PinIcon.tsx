import Image from 'next/image';

export default function PinIcon() {
  return (
    <div className="flex items-center justify-center h-5 w-5 bg-black">
      <Image width="20" height="20" src="../pin.svg" title="Pinned" alt="Pinned" />
    </div>
  )
}
