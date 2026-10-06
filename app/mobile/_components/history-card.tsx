import { cx, uiStyles } from "./ui";
import styles from "./history-card.module.css";

/** Card used by Donation History and Request History. */
export function HistoryCard({ date, bloodType, title, subtitle, badge, roomy = false }: {
  date: string;
  bloodType: string;
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  roomy?: boolean;
}) {
  return (
    <article className={cx(uiStyles.cardTinted, styles.card, roomy && styles.roomy)}>
      <div className={styles.top}>
        <time>{date}</time>
        <span className={styles.tag}>{bloodType}</span>
      </div>
      <div className={styles.body}>
        <h2>{title}</h2>
        <div className={styles.bottom}>
          <p>{subtitle}</p>
          {badge}
        </div>
      </div>
    </article>
  );
}
