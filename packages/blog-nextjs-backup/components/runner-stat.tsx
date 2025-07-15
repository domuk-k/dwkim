import Image from 'next/image';

interface RunnerStatProps {
  totalDistance: number;
  remainingDistance: number;
  goalDistance: number;
}

const RunnerStat = ({
  totalDistance,
  remainingDistance,
  goalDistance,
}: RunnerStatProps) => {
  return (
    <section className="bg-[#01F87D] p-6 rounded-3xl w-full max-w-sm">
      <div className="space-y-4">
        <h2 className="text-black text-lg font-medium mb-1 flex items-center gap-2">
          <Image
            src="/nike-logo.svg"
            alt="Nike Run Club Logo"
            width={20}
            height={20}
          />
          2024년 달린 거리
        </h2>
        <p className="text-black text-5xl font-bold">
          {totalDistance.toFixed(1)}
          <span className="text-black/50 text-lg">km</span>
        </p>
        <div className="space-y-2">
          <p className="text-black">그린</p>
          <div className="w-full bg-black/10 rounded-full h-2">
            <div
              className="bg-black h-full rounded-full"
              style={{
                width: `${(totalDistance / goalDistance) * 100}%`,
              }}
            />
          </div>
          <p className="text-black">
            블루까지 {remainingDistance.toFixed(1)} km 남음
          </p>
        </div>
      </div>
    </section>
  );
};

export default RunnerStat;
