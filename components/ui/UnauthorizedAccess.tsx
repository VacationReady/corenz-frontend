import { LockKeyhole } from "lucide-react";
import styles from "./UnauthorizedAccess.module.css";

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
      <div className={`${styles.padlockWrapper} relative mb-8`}>
        <div className={styles.padlockHalo} aria-hidden />
        <div className={styles.padlockContainer}>
          <div className={styles.padlockInner} />
          <LockKeyhole className={`h-14 w-14 text-white ${styles.padlockIcon}`} strokeWidth={1.25} />
          <div className={styles.padlockShadow} aria-hidden />
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl mb-2">
        {title}
      </h1>
      <p className="text-sm text-slate-500 sm:text-base max-w-md leading-relaxed">
        {description}
      </p>
    </div>
  );
}
