"use client";

import { Drop, HandHeart, LockKey, PencilSimple, Question, ShieldCheck, SignOut, User } from "@phosphor-icons/react";
import Link from "next/link";
import { useSession } from "@/app/mobile/_components/session";
import { IconWell, MenuRow, ProfilePhoto, Screen } from "@/app/mobile/_components/ui";
import styles from "./page.module.css";

type Item = { href: string; label: string; description: string; icon: React.ReactNode; muted?: boolean };

const sections: { title: string; items: Item[] }[] = [
  {
    title: "Account",
    items: [
      { href: "/profile/personal", label: "Personal information", description: "Name, phone, birthday, and gender", icon: <IconWell icon={User} round /> },
      { href: "/profile/password", label: "Password & security", description: "Change your password", icon: <IconWell icon={LockKey} round /> },
      { href: "/profile/privacy", label: "Privacy", description: "Who can find you and see your details", icon: <IconWell icon={ShieldCheck} round /> },
    ],
  },
  {
    title: "Blood & donating",
    items: [
      { href: "/profile/blood", label: "Blood information", description: "Blood type and compatibility", icon: <IconWell icon={Drop} round /> },
      { href: "/donate", label: "Donating", description: "Availability, eligibility, and donor details", icon: <IconWell icon={HandHeart} round /> },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/help", label: "Help & support", description: "Common questions about donating", icon: <IconWell icon={Question} round /> },
      { href: "/profile/logout", label: "Log out", description: "Sign out on this device", icon: <IconWell icon={SignOut} round /> },
    ],
  },
];

export default function ProfilePage() {
  const { profile } = useSession();

  return (
    <Screen nav="profile" gap={20}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.identity}>
        <ProfilePhoto src={profile.photoURL} size={72} ring="white" />
        <span className={styles.who}>
          <strong>{profile.fullName || "Your name"}</strong>
          <small>{profile.email}</small>
        </span>
        <Link href="/profile/edit" className={styles.edit}>
          <PencilSimple size={16} weight="bold" /> Edit
        </Link>
      </section>

      {sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2>{section.title}</h2>
          <div className={styles.menu}>
            {section.items.map((item) => <MenuRow key={item.href} {...item} />)}
          </div>
        </section>
      ))}
    </Screen>
  );
}
