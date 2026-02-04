type ProgressStepperProps = {
  steps: string[];
  currentStep: number;
};

export default function ProgressStepper({
  steps,
  currentStep,
}: ProgressStepperProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((step, index) => {
        const isActive = index <= currentStep;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                isActive
                  ? "border-fuchsia-400 bg-fuchsia-500/20 text-white"
                  : "border-white/10 text-white/40"
              }`}
            >
              {index + 1}
            </div>
            <span className={isActive ? "text-white" : "text-white/40"}>
              {step}
            </span>
            {index !== steps.length - 1 && (
              <div className="h-px w-6 bg-white/10" />
            )}
          </div>
        );
      })}
    </div>
  );
}
