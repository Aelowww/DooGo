import Link from "next/link";
import styles from "./mobile/_components/ui.module.css";
import buttonStyles from "./mobile/_components/button.module.css";

export default function NotFound() {
  return (
    <main className={styles.stage}>
      <div className={styles.phone}>
        <div className={styles.content} style={{ justifyContent: "center", textAlign: "center" }}>
          <h1 className={styles.heroTitle}>Page not found</h1>
          <p className={styles.intro}>This screen doesn&apos;t exist in DooGo.</p>
          <Link href="/home" className={`${buttonStyles.button} ${buttonStyles.primary}`}>Go to Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
