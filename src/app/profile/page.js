import { devotionals } from "@/data/devotionals";
import {
  getProfileData,
  getCustomDevotionalSummaries,
} from "@/app/actions/dbActions";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const [initialData, customRes] = await Promise.all([
    getProfileData(),
    getCustomDevotionalSummaries(),
  ]);

  const reflectionPlanIds = new Set(
    Object.keys(initialData?.reflections || {}).map((key) => {
      const idx = key.lastIndexOf("_");
      return idx === -1 ? key : key.substring(0, idx);
    })
  );

  const planMetaMap = {};
  Object.values(devotionals).forEach((p) => {
    const meta = {
      id: p.id,
      title: p.title,
      daysCount: p.days?.length || 0,
    };
    if (reflectionPlanIds.has(p.id)) {
      meta.dayTitles = Object.fromEntries(
        (p.days || []).map((d) => [d.day, d.title])
      );
    }
    planMetaMap[p.id] = meta;
  });

  if (customRes?.success && Array.isArray(customRes.plans)) {
    customRes.plans.forEach((p) => {
      planMetaMap[p.id] = {
        id: p.id,
        title: p.title,
        daysCount: p.daysCount || 0,
      };
    });
  }

  const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

  return (
    <ProfileClient
      initialData={initialData}
      planMetaMap={planMetaMap}
      dayOfWeek={dayOfWeek}
    />
  );
}
