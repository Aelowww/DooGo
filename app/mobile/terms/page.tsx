import { LegalPage } from "@/app/mobile/_components/legal-page";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: "By downloading, accessing, or using DooGo, you agree to be bound by these terms. If you do not agree, please do not use the application.",
  },
  {
    title: "2. User Responsibilities",
    body: "Users must provide accurate, current, and complete personal and medical information. You are solely responsible for maintaining account confidentiality.",
  },
  {
    title: "3. Blood Donation Disclaimer",
    body: "DooGo is a platform linking donors and seekers. We do not perform medical screening or verification of blood safety, which is the responsibility of healthcare facilities.",
  },
  {
    title: "4. Data Collection",
    body: "Your sign-up data, location, and blood donation preferences are processed in accordance with our Privacy Policy. Data integrity and consent are strictly maintained.",
  },
  {
    title: "5. Limitation of Liability",
    body: "To the maximum extent permitted by law, DooGo shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use of our services.",
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms and Conditions" sections={sections} action="I Accept" />;
}
