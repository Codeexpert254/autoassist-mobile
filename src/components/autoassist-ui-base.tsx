import { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type Tone = "blue" | "green" | "amber" | "red" | "neutral";

export type ScreenBlock =
  | {
      type: "hero";
      eyebrow?: string;
      title: string;
      value?: string;
      meta?: string;
      tone?: Tone;
      trailing?: string;
    }
  | {
      type: "sectionTitle";
      title: string;
    }
  | {
      type: "card";
      title: string;
      subtitle?: string;
      meta?: string;
      badge?: string;
      tone?: Tone;
      trailing?: string;
    }
  | {
      type: "cards";
      items: Array<{
        title: string;
        subtitle?: string;
        meta?: string;
        badge?: string;
        tone?: Tone;
        trailing?: string;
      }>;
    }
  | {
      type: "rows";
      items: Array<{ label: string; value: string }>;
      strongLast?: boolean;
    }
  | {
      type: "fields";
      items: Array<{ label: string; value: string; multiline?: boolean }>;
    }
  | {
      type: "chips";
      items: string[];
      active?: number;
    }
  | {
      type: "callout";
      title?: string;
      text: string;
      tone?: Tone;
    }
  | {
      type: "timeline";
      items: Array<{
        title: string;
        subtitle?: string;
        status?: "done" | "active" | "pending";
        trailing?: string;
      }>;
    }
  | {
      type: "route";
      eyebrow?: string;
      from: string;
      to: string;
      meta?: string;
      eta?: string;
    }
  | {
      type: "success";
      title: string;
      text?: string;
      symbol?: string;
      tone?: Tone;
    }
  | {
      type: "search";
      placeholder: string;
    }
  | {
      type: "products";
      items: Array<{
        label: string;
        title: string;
        subtitle?: string;
        price: string;
      }>;
    }
  | {
      type: "categories";
      items: Array<{ label: string; short: string }>;
    }
  | {
      type: "rating";
      title: string;
      value?: string;
    }
  | {
      type: "spacer";
      size?: number;
    };

export type StaticScreenProps = {
  title: string;
  subtitle?: string;
  blocks?: ScreenBlock[];
  primaryAction?: string;
  secondaryAction?: string;
  bottomNav?: boolean;
  activeTab?: "Home" | "Jobs" | "Messages" | "Profile";
  inset?: number;
  headerBack?: boolean;
};

const tone = {
  blue: { bg: "#EAF2FD", border: "#B8D2F0", accent: "#1857A6" },
  green: { bg: "#EAF7F1", border: "#B7DFC9", accent: "#1B8A5A" },
  amber: { bg: "#FFF7E8", border: "#F5B942", accent: "#D98200" },
  red: { bg: "#FFF1F2", border: "#F3C5C9", accent: "#D9363E" },
  neutral: { bg: "#F8FAFC", border: "#E4E7EC", accent: "#667085" },
};

export function StaticScreen({
  title,
  subtitle,
  blocks = [],
  primaryAction,
  secondaryAction,
  bottomNav = false,
  activeTab = "Home",
  inset = 24,
  headerBack = true,
}: StaticScreenProps) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: inset }]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title={title} subtitle={subtitle} back={headerBack} />

          <View style={styles.blocks}>
            {blocks.map((block, index) => (
              <Block block={block} key={`${block.type}-${index}`} />
            ))}
          </View>

          <View style={styles.actionArea}>
            {primaryAction ? (
              <Pressable style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>{primaryAction}</Text>
              </Pressable>
            ) : null}
            {secondaryAction ? (
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{secondaryAction}</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        {bottomNav ? <BottomNav active={activeTab} /> : null}
      </SafeAreaView>
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back = true,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerRow}>
        {back ? (
          <Pressable style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : null}
        <Text style={styles.screenTitle}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Block({ block }: { block: ScreenBlock }) {
  if (block.type === "hero") {
    const c = tone[block.tone ?? "blue"];
    return (
      <View style={[styles.hero, { backgroundColor: c.bg, borderColor: c.border }]}>
        <View style={styles.heroTop}>
          <View style={styles.flexOne}>
            {block.eyebrow ? (
              <Text style={[styles.eyebrow, { color: c.accent }]}>{block.eyebrow}</Text>
            ) : null}
            <Text style={styles.heroTitle}>{block.title}</Text>
          </View>
          {block.trailing ? (
            <View style={[styles.pillSmall, { backgroundColor: c.accent }]}>
              <Text style={styles.pillSmallText}>{block.trailing}</Text>
            </View>
          ) : null}
        </View>
        {block.value ? <Text style={[styles.heroValue, { color: c.accent }]}>{block.value}</Text> : null}
        {block.meta ? <Text style={styles.heroMeta}>{block.meta}</Text> : null}
      </View>
    );
  }

  if (block.type === "sectionTitle") {
    return <Text style={styles.sectionTitle}>{block.title}</Text>;
  }

  if (block.type === "card") {
    return <InfoCard {...block} />;
  }

  if (block.type === "cards") {
    return (
      <View style={styles.cardStack}>
        {block.items.map((item, i) => (
          <InfoCard key={`${item.title}-${i}`} {...item} />
        ))}
      </View>
    );
  }

  if (block.type === "rows") {
    return (
      <View style={styles.rowsWrap}>
        {block.items.map((item, i) => (
          <View
            style={[
              styles.rowItem,
              i < block.items.length - 1 && styles.rowDivider,
            ]}
            key={`${item.label}-${i}`}
          >
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text
              style={[
                styles.rowValue,
                block.strongLast && i === block.items.length - 1 && styles.rowValueStrong,
              ]}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "fields") {
    return (
      <View style={styles.fieldStack}>
        {block.items.map((item, i) => (
          <View key={`${item.label}-${i}`}>
            <Text style={styles.fieldLabel}>{item.label}</Text>
            <TextInput
              style={[styles.fieldInput, item.multiline && styles.fieldInputMultiline]}
              value={item.value}
              editable={false}
              multiline={item.multiline}
              textAlignVertical={item.multiline ? "top" : "center"}
            />
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "chips") {
    return (
      <View style={styles.chipWrap}>
        {block.items.map((item, i) => {
          const active = (block.active ?? 0) === i;
          return (
            <View style={[styles.chip, active && styles.chipActive]} key={item}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  if (block.type === "callout") {
    const c = tone[block.tone ?? "neutral"];
    return (
      <View style={[styles.callout, { backgroundColor: c.bg, borderColor: c.border }]}>
        {block.title ? <Text style={styles.calloutTitle}>{block.title}</Text> : null}
        <Text style={styles.calloutText}>{block.text}</Text>
      </View>
    );
  }

  if (block.type === "timeline") {
    return (
      <View style={styles.timeline}>
        {block.items.map((item, i) => {
          const status = item.status ?? "pending";
          const c = status === "done" ? "#1B8A5A" : status === "active" ? "#1857A6" : "#C2C7CF";
          return (
            <View style={styles.timelineRow} key={`${item.title}-${i}`}>
              <View style={styles.timelineMarkerWrap}>
                <View style={[styles.timelineMarker, { borderColor: c, backgroundColor: status === "pending" ? "#FFFFFF" : c }]} />
                {i < block.items.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>
              <View style={styles.timelineTextWrap}>
                <Text style={styles.timelineTitle}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.timelineSubtitle}>{item.subtitle}</Text> : null}
              </View>
              {item.trailing ? <Text style={styles.timelineTrailing}>{item.trailing}</Text> : null}
            </View>
          );
        })}
      </View>
    );
  }

  if (block.type === "route") {
    return (
      <View style={styles.routeCard}>
        {block.eyebrow ? <Text style={styles.eyebrow}>{block.eyebrow}</Text> : null}
        <View style={styles.routeRow}>
          <View style={styles.routeDot} />
          <View style={styles.flexOne}>
            <Text style={styles.routePoint}>{block.from}</Text>
          </View>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, styles.routeDotEnd]} />
          <View style={styles.flexOne}>
            <Text style={styles.routePoint}>{block.to}</Text>
          </View>
        </View>
        {block.meta || block.eta ? (
          <View style={styles.routeFooter}>
            <Text style={styles.routeMeta}>{block.meta}</Text>
            {block.eta ? <Text style={styles.routeEta}>{block.eta}</Text> : null}
          </View>
        ) : null}
      </View>
    );
  }

  if (block.type === "success") {
    const c = tone[block.tone ?? "green"];
    return (
      <View style={styles.successWrap}>
        <View style={[styles.successCircle, { backgroundColor: c.bg, borderColor: c.accent }]}>
          <Text style={[styles.successSymbol, { color: c.accent }]}>{block.symbol ?? "✓"}</Text>
        </View>
        <Text style={styles.successTitle}>{block.title}</Text>
        {block.text ? <Text style={styles.successText}>{block.text}</Text> : null}
      </View>
    );
  }

  if (block.type === "search") {
    return (
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>{block.placeholder}</Text>
      </View>
    );
  }

  if (block.type === "products") {
    return (
      <View style={styles.cardStack}>
        {block.items.map((item, i) => (
          <View style={styles.productCard} key={`${item.title}-${i}`}>
            <View style={styles.productThumb}>
              <Text style={styles.productThumbText}>{item.label}</Text>
            </View>
            <View style={styles.productBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.cardSubtitle}>{item.subtitle}</Text> : null}
              <Text style={styles.productPrice}>{item.price}</Text>
            </View>
            <View style={styles.viewPill}><Text style={styles.viewPillText}>View</Text></View>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "categories") {
    return (
      <View style={styles.categoryRow}>
        {block.items.map((item) => (
          <View style={styles.categoryCard} key={item.label}>
            <View style={styles.categoryIcon}><Text style={styles.categoryIconText}>{item.short}</Text></View>
            <Text style={styles.categoryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (block.type === "rating") {
    return (
      <View style={styles.ratingWrap}>
        <Text style={styles.sectionTitle}>{block.title}</Text>
        <Text style={styles.ratingStars}>{block.value ?? "★ ★ ★ ★ ★"}</Text>
      </View>
    );
  }

  return <View style={{ height: block.size ?? 12 }} />;
}

function InfoCard({
  title,
  subtitle,
  meta,
  badge,
  tone: toneName = "neutral",
  trailing,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  tone?: Tone;
  trailing?: string;
}) {
  const c = tone[toneName];
  return (
    <View style={[styles.infoCard, toneName !== "neutral" && { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={styles.infoTop}>
        <View style={styles.flexOne}>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.accent }]}>{badge}</Text>
            </View>
          ) : null}
          <Text style={styles.cardTitle}>{title}</Text>
          {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
          {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
        </View>
        {trailing ? <Text style={styles.cardTrailing}>{trailing}</Text> : null}
      </View>
    </View>
  );
}

export function BottomNav({ active = "Home" }: { active?: "Home" | "Jobs" | "Messages" | "Profile" }) {
  const items = ["Home", "Jobs", "Messages", "Profile"] as const;
  return (
    <View style={styles.bottomNav}>
      {items.map((item) => (
        <Text style={[styles.navText, active === item && styles.navTextActive]} key={item}>
          {item}
        </Text>
      ))}
    </View>
  );
}

export function AdminScreen({
  title,
  subtitle,
  metrics = [],
  items = [],
  active = "Overview",
}: {
  title: string;
  subtitle: string;
  metrics?: Array<{ title: string; value: string; meta?: string }>;
  items?: Array<{ title: string; subtitle: string }>;
  active?: string;
}) {
  const nav = ["Overview", "Verification", "Live jobs", "Orders", "Payments", "Support", "Users", "Analytics"];
  return (
    <View style={styles.adminScreen}>
      <View style={styles.adminSidebar}>
        <Text style={styles.adminBrand}>AUTOASSIST OPS</Text>
        {nav.map((item) => (
          <View style={[styles.adminNavItem, item === active && styles.adminNavActive]} key={item}>
            <Text style={[styles.adminNavText, item === active && styles.adminNavTextActive]}>{item}</Text>
          </View>
        ))}
      </View>
      <ScrollView style={styles.adminMain} contentContainerStyle={styles.adminContent}>
        <Text style={styles.adminTitle}>{title}</Text>
        <Text style={styles.adminSubtitle}>{subtitle}</Text>
        {metrics.length ? (
          <View style={styles.adminMetricGrid}>
            {metrics.map((m) => (
              <View style={styles.adminMetric} key={m.title}>
                <Text style={styles.adminMetricTitle}>{m.title}</Text>
                <Text style={styles.adminMetricValue}>{m.value}</Text>
                {m.meta ? <Text style={styles.adminMetricMeta}>{m.meta}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.adminList}>
          {items.map((item) => (
            <View style={styles.adminListCard} key={item.title}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingTop: 12, paddingBottom: 24 },
  headerWrap: { marginBottom: 22 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 30, marginRight: 0, justifyContent: "center" },
  backText: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 26, lineHeight: 30 },
  screenTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 20, flex: 1 },
  screenSubtitle: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 9 },
  blocks: { gap: 16 },
  flexOne: { flex: 1 },
  hero: { minHeight: 110, borderWidth: 1, borderRadius: 14, padding: 18, justifyContent: "center" },
  heroTop: { flexDirection: "row", alignItems: "flex-start" },
  eyebrow: { color: "#667085", fontFamily: "Inter_600SemiBold", fontSize: 11, marginBottom: 8 },
  heroTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 18, lineHeight: 24 },
  heroValue: { fontFamily: "Inter_600SemiBold", fontSize: 23, marginTop: 10 },
  heroMeta: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 8 },
  pillSmall: { minWidth: 48, height: 28, paddingHorizontal: 12, borderRadius: 14, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  pillSmallText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  sectionTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 6 },
  cardStack: { gap: 10 },
  infoCard: { minHeight: 78, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: "#FFFFFF", justifyContent: "center" },
  infoTop: { flexDirection: "row", alignItems: "center" },
  cardTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 13, lineHeight: 18 },
  cardSubtitle: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15, marginTop: 5 },
  cardMeta: { color: "#344054", fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 15, marginTop: 6 },
  cardTrailing: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 12, marginLeft: 12 },
  badge: { alignSelf: "flex-start", minHeight: 26, borderRadius: 13, borderWidth: 1, paddingHorizontal: 10, justifyContent: "center", marginBottom: 10 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  rowsWrap: { borderRadius: 12, backgroundColor: "#FFFFFF" },
  rowItem: { minHeight: 62, flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "#C2C7CF" },
  rowLabel: { width: "35%", color: "#667085", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  rowValue: { flex: 1, color: "#344054", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  rowValueStrong: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 15, textAlign: "right" },
  fieldStack: { gap: 15 },
  fieldLabel: { color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 3 },
  fieldInput: { height: 50, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 14, color: "#344054", fontFamily: "Inter_400Regular", fontSize: 14, backgroundColor: "#FFFFFF" },
  fieldInputMultiline: { minHeight: 88, paddingTop: 14 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 34, paddingHorizontal: 16, borderRadius: 17, borderWidth: 1, borderColor: "#D0D5DD", justifyContent: "center", alignItems: "center" },
  chipActive: { backgroundColor: "#1857A6", borderColor: "#1857A6" },
  chipText: { color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  chipTextActive: { color: "#FFFFFF" },
  callout: { borderWidth: 1, borderRadius: 12, padding: 14 },
  calloutTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 8 },
  calloutText: { color: "#344054", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  timeline: { gap: 0 },
  timelineRow: { minHeight: 64, flexDirection: "row", alignItems: "flex-start" },
  timelineMarkerWrap: { width: 28, alignItems: "center" },
  timelineMarker: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, marginTop: 2 },
  timelineLine: { width: 2, flex: 1, minHeight: 38, backgroundColor: "#E4E7EC", marginTop: 4 },
  timelineTextWrap: { flex: 1, paddingLeft: 10 },
  timelineTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  timelineSubtitle: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 5 },
  timelineTrailing: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 11, marginLeft: 8 },
  routeCard: { minHeight: 180, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, backgroundColor: "#F8FAFC", padding: 18 },
  routeRow: { flexDirection: "row", alignItems: "center" },
  routeDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#1857A6", marginRight: 16 },
  routeDotEnd: { backgroundColor: "#1B8A5A" },
  routeLine: { width: 4, height: 55, backgroundColor: "#B8D2F0", marginLeft: 10, marginVertical: 4 },
  routePoint: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  routeFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  routeMeta: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 11 },
  routeEta: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  successWrap: { alignItems: "center", paddingVertical: 18 },
  successCircle: { width: 92, height: 92, borderRadius: 46, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  successSymbol: { fontFamily: "Inter_600SemiBold", fontSize: 32 },
  successTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 18, textAlign: "center" },
  successText: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 10, maxWidth: 310 },
  searchBox: { height: 50, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  searchIcon: { color: "#667085", fontSize: 20, marginRight: 8 },
  searchPlaceholder: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 13 },
  productCard: { minHeight: 126, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" },
  productThumb: { width: 82, height: 82, borderRadius: 12, backgroundColor: "#EAF2FD", alignItems: "center", justifyContent: "center", marginRight: 14 },
  productThumbText: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  productBody: { flex: 1 },
  productPrice: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 9 },
  viewPill: { minWidth: 58, height: 30, borderRadius: 15, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  viewPillText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  categoryRow: { flexDirection: "row", gap: 8 },
  categoryCard: { flex: 1, minHeight: 88, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  categoryIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: "#EAF2FD", alignItems: "center", justifyContent: "center", marginBottom: 7 },
  categoryIconText: { color: "#1857A6", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  categoryLabel: { color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  ratingWrap: { gap: 12 },
  ratingStars: { color: "#F5B942", fontFamily: "Inter_600SemiBold", fontSize: 24, letterSpacing: 5 },
  actionArea: { marginTop: "auto", paddingTop: 28, gap: 10 },
  primaryButton: { minHeight: 48, borderRadius: 10, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "center" },
  secondaryButton: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: "#D0D5DD", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryButtonText: { color: "#344054", fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "center" },
  bottomNav: { minHeight: 64, borderTopWidth: 1, borderTopColor: "#E4E7EC", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingBottom: 2 },
  navText: { flex: 1, color: "#98A2B3", fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center" },
  navTextActive: { color: "#1857A6", fontFamily: "Inter_600SemiBold" },

  adminScreen: { flex: 1, flexDirection: "row", backgroundColor: "#FFFFFF" },
  adminSidebar: { width: 190, backgroundColor: "#123D76", paddingHorizontal: 16, paddingTop: 30 },
  adminBrand: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 32, paddingHorizontal: 8 },
  adminNavItem: { minHeight: 36, borderRadius: 8, justifyContent: "center", paddingHorizontal: 12, marginBottom: 12 },
  adminNavActive: { backgroundColor: "#1857A6" },
  adminNavText: { color: "#DCE9F8", fontFamily: "Inter_400Regular", fontSize: 12 },
  adminNavTextActive: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  adminMain: { flex: 1 },
  adminContent: { padding: 34 },
  adminTitle: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 22 },
  adminSubtitle: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 10, marginBottom: 28 },
  adminMetricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 24 },
  adminMetric: { width: 170, minHeight: 92, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 12, padding: 14 },
  adminMetricTitle: { color: "#667085", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  adminMetricValue: { color: "#102A43", fontFamily: "Inter_600SemiBold", fontSize: 20, marginTop: 8 },
  adminMetricMeta: { color: "#667085", fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 8 },
  adminList: { gap: 14 },
  adminListCard: { minHeight: 78, borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 12, padding: 14, justifyContent: "center" },
});
