import { LegalPage } from "@/app/mobile/_components/legal-page";

const sections = [
  {
    title: "1. Information We Collect",
    body: "We collect personal data such as name, email, phone number, location, and blood type to facilitate smooth matchings between donors and seekers.",
  },
  {
    title: "2. How We Use Your Data",
    body: "Your data helps verify eligibility, display available donor profiles, send notifications, and handle request coordinate systems effectively.",
  },
  {
    title: "3. Data Sharing",
    body: "Your profile information (blood type, username, city) is only visible to registered seekers if you opt-in to be visible.",
  },
  {
    title: "4. Your Rights",
    body: "You can update or delete your profile information, toggle donor availability status, or close your account permanently at any time.",
  },
  {
    title: "5. Contact Us",
    body: "For questions or concerns regarding your private information, contact support through the help channels on the app.",
  },
];

export default function PrivacyPolicyPage() {
  return <LegalPage title="Privacy Policy" sections={sections} action="Back" actionVariant="outline" />;
}
