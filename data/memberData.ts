// data/memberData.ts
// This file contains shared data for member-related features

import { SMSTemplate } from "@/types/member";

// SMS Templates for member notifications
export const smsTemplates: SMSTemplate[] = [
  {
    id: "due-payment",
    title: "Due Payment Reminder",
    message: "Hello Annette Black, your membership fee of 3-M...",
    type: "reminder",
  },
  {
    id: "package-renewal",
    title: "Package Renewal Reminder",
    message: "Hello Annette Black, your membership fee of 3-M...",
    type: "renewal",
  },
  {
    id: "occasion-greeting",
    title: "Occasion Greeting",
    message: "Eid Mubarak! Stay strong and fit with Silver Gym",
    type: "greeting",
  },
];