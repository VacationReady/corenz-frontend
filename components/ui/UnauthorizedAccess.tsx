import { LockKeyhole } from "lucide-react";

interface UnauthorizedAccessProps {
  title?: string;
  description?: string;
}

export default function UnauthorizedAccess({
  title = "Access restricted",
  description = "You can only view employee profiles within your permitted scope.",
}: UnauthorizedAccessProps) {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8">
        <div className="padlock__halo" aria-hidden />
        <div className="padlock__container">
          <div className="padlock__inner" />
          <LockKeyhole className="padlock__icon" strokeWidth={1.25} />
          <div className="padlock__shadow" aria-hidden />
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl mb-2">
        {title}
      </h1>
      <p className="text-sm text-slate-500 sm:text-base max-w-md leading-relaxed">
        {description}
      </p>

      <style jsx>{`
        .padlock__halo {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: radial-gradient(circle at 30% 30%, rgba(248, 113, 113, 0.35), transparent 65%),
            radial-gradient(circle at 70% 70%, rgba(251, 191, 36, 0.35), transparent 60%);
          filter: blur(30px);
          animation: padlockPulse 4.2s ease-in-out infinite;
        }

        .padlock__container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 7rem;
          height: 7rem;
          border-radius: 9999px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
          box-shadow:
            0 20px 40px rgba(15, 23, 42, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 -1px 0 rgba(15, 23, 42, 0.5);
          overflow: hidden;
        }

        .padlock__inner {
          position: absolute;
          inset: 10%;
          border-radius: 9999px;
          background: linear-gradient(160deg, rgba(51, 65, 85, 1), rgba(15, 23, 42, 0.92));
          filter: blur(0.5px);
        }

        .padlock__icon {
          position: relative;
          z-index: 1;
          width: 3.5rem;
          height: 3.5rem;
          color: white;
          animation: padlockFloat 3.6s ease-in-out infinite;
        }

        .padlock__shadow {
          position: absolute;
          bottom: -1.2rem;
          width: 60%;
          height: 0.8rem;
          border-radius: 9999px;
          background: rgba(15, 23, 42, 0.25);
          filter: blur(8px);
          animation: padlockShadow 3.6s ease-in-out infinite;
        }

        @keyframes padlockFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes padlockPulse {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.05);
          }
        }

        @keyframes padlockShadow {
          0%,
          100% {
            opacity: 0.32;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.18;
            transform: translateY(4px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
